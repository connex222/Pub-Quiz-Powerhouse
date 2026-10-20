"""Alpha 5 real-browser host UI smoke tests. Needs Python playwright + Chromium; no Node packages.
Serves an instrumented temporary copy of the app; production file stays untouched.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PUB = ROOT / 'public'
html = (PUB/'index.html').read_text()
assert html.count('})();\n</script>') == 1
probe = """
window.__approvalTest = {
  join: m => onNetMsg(netTopic('in'), JSON.stringify(m)),
  setup: () => {
    S.net.on=true; S.net.room='ROOM42'; S.net.requireApproval=true;
    NET.leader=true; NET.key='ROOM42|0'; NET.status='online'; NET.joinRequests.clear(); NET.phones.clear();
    window.__sent=[]; window.__assigned=[];
    NET.client={online:true,
      publish:(topic,msg)=>{window.__sent.push({topic,msg:JSON.parse(msg)});return true;},
      assignPhone:(room,cid,team,cb)=>{window.__assigned.push({room,cid,team});cb(true);}
    };
    view='host'; render();
    return S.teams.map(t=>({id:t.id,name:t.name}));
  },
  pending: () => [...NET.joinRequests.values()],
  phones: () => [...NET.phones.entries()],
  teamNames: () => S.teams.map(t=>t.name),
};
"""
modified=html.replace('})();\n</script>',probe+'})();\n</script>')
for name in ('/socket.io/socket.io.js', '/quiz-rules.js', '/quiz-lifecycle.js', '/show-buzzer.js'):
    src_tag = f'<script src="{name}"></script>'
    script = '' if name.startswith('/socket.io') else (PUB/name.lstrip('/')).read_text()
    modified=modified.replace(src_tag, '<script>'+script+'</script>')
with TemporaryDirectory() as d:
    d=Path(d)
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
            page=browser.new_page(viewport={'width':1440,'height':950})
            errors=[]
            page.on('pageerror',lambda e: errors.append(str(e)))
            page.set_content(modified,wait_until='domcontentloaded')
            page.wait_for_function('!!window.__approvalTest')
            team_ids=page.evaluate('window.__approvalTest.setup()')
            first=team_ids[0]['id']
            page.evaluate('(tid)=>window.__approvalTest.join({k:"join",cid:"phone123",team:tid})', first)
            assert page.locator('.join-approvals .approval-entry').count()==1
            page.screenshot(path=str(d/'approval-preview.png'),full_page=False)
            assert page.evaluate('window.__assigned.length') == 0,'cannot assign before approval'
            assert page.evaluate('window.__sent.filter(x=>x.topic.endsWith("out/phone123")).at(-1).msg.k')=='pending'
            page.get_by_role('button',name='Approve').click()
            assert page.locator('.join-approvals').count()==0
            assert page.evaluate('window.__assigned.length')==1
            assert page.evaluate('window.__sent.filter(x=>x.topic.endsWith("out/phone123")).at(-1).msg.k')=='joined'
            page.evaluate('(tid)=>window.__approvalTest.join({k:"join",cid:"phone123",team:tid})', first)
            assert page.evaluate('window.__assigned.length')==1,'same approved phone reconnects without reassignment'
            assert page.locator('.join-approvals').count()==0
            page.evaluate('(tid)=>window.__approvalTest.join({k:"join",cid:"phone456",team:tid})', first)
            page.get_by_role('button',name='Reject').click()
            assert page.evaluate('window.__sent.filter(x=>x.topic.endsWith("out/phone456")).at(-1).msg.k')=='nojoin'
            assert page.evaluate('window.__assigned.length')==1,'rejected phone is not assigned'
            team_count=len(page.evaluate('window.__approvalTest.teamNames()'))
            page.evaluate('window.__approvalTest.join({k:"join",cid:"phone789",name:"New Winners"})')
            assert len(page.evaluate('window.__approvalTest.teamNames()'))==team_count,'team not created without approval'
            page.get_by_role('button',name='Approve').click()
            assert 'New Winners' in page.evaluate('window.__approvalTest.teamNames()')
            page.evaluate('window.__approvalTest.join({k:"join",cid:"phone000",name:"Cancel Me"})')
            page.evaluate('window.__approvalTest.join({k:"cancel",cid:"phone000"})')
            assert page.locator('.join-approvals').count()==0
            assert not errors,errors[:5]
            print('PASS: browser join queue, approve, reject, reconnect, new-team approval, cancellation')
            browser.close()
    finally:
        pass
