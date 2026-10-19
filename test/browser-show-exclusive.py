"""Headless host-state checks for v3.3 Alpha 3, offline and without Socket.io.
Do not substitute these checks for a real-device latency/reconnect test.
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'public/index.html').read_text().replace('<script src="/socket.io/socket.io.js"></script>', '')
for name in ('quiz-rules.js','quiz-lifecycle.js','show-buzzer.js'):
    html=html.replace(f'<script src="/{name}"></script>', '<script>'+ (ROOT/'public'/name).read_text() + '</script>')
store="""() => {const m=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}});window.__store=m;}"""
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    def setup(penalty=False):
        page=browser.new_page(viewport={'width':1440,'height':900})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto('about:blank');page.evaluate(store);page.set_content(html)
        page.locator('[data-act="set-experience"][data-experience="show"]').click()
        page.locator('[data-bind="round-field"][data-r="0"][data-f="mode"]').first.select_option('buzz')
        if penalty: page.locator('[data-bind="set"][data-k="penalty"]').check()
        page.locator('[data-act="start-quiz"]').click()
        assert page.locator('body.view-host').count()==1
        return page,errors
    score=lambda pg,id: int(pg.locator('.score-row').filter(has=pg.locator(f'button[data-id="{id}"]')).first.locator('.tscore').inner_text())
    def buttons(pg):
        return pg.locator('button.mini-pad[data-act="buzz"]').all()
    page,errors=setup()
    btns=buttons(page)
    ids=[b.get_attribute('data-id') for b in btns]
    assert len(ids)>=2,ids
    btns[0].click()
    assert page.locator('ol.queue li').count()==1
    assert page.locator('button[data-act="buzz-toggle"]').first.is_disabled(), 'cannot force-open during live answer'
    buttons(page)[1].click()  # contending buzz cannot queue
    assert page.locator('ol.queue li').count()==1
    assert 'other buzzers locked' in page.locator('.judge').last.inner_text()
    page.locator('[data-act="reveal"]').first.click()
    assert page.locator('.lifecycle').first.inner_text()=='LOCKED', 'no reveal until first team judged'
    page.locator('[data-act="judge-wrong"]').first.click()
    assert page.locator('ol.queue li').count()==1
    assert page.locator('ol.queue li.wrong').count()==1
    assert page.locator('.lifecycle').first.inner_text()=='OPEN'
    buttons(page)[0].click()  # wrong team permanently ineligible
    assert page.locator('ol.queue li').count()==1
    buttons(page)[1].click()
    assert page.locator('ol.queue li').count()==2
    assert page.locator('ol.queue li.active').count()==1
    page.locator('[data-act="judge-right"]').first.click()
    assert page.locator('.lifecycle').first.inner_text()=='FINALISED'
    assert score(page,ids[0])==0 and score(page,ids[1])==1
    assert page.locator('.answer-box.shown').count()==1, 'correct auto reveals'
    page.locator('[data-act="next"]').first.click()
    assert page.locator('.lifecycle').first.inner_text()=='OPEN'
    assert not errors,errors
    print('PASS: first claim locks, wrong reopens, no repeat, correct awards and closes')
    page.close()
    page,errors=setup(penalty=True)
    ids=[b.get_attribute('data-id') for b in buttons(page)]
    buttons(page)[0].click();page.locator('[data-act="judge-wrong"]').first.click()
    assert score(page,ids[0])==-1,'penalty must be linked to question group'
    buttons(page)[1].click();page.locator('[data-act="judge-right"]').first.click()
    assert score(page,ids[1])==1
    page.locator('[data-act="reopen-current"]').first.click();page.locator('#askYes').click()
    assert score(page,ids[0])==0 and score(page,ids[1])==0,'reopen must roll back winning points and wrong penalty'
    assert page.locator('ol.queue li').count()==0
    assert page.locator('.lifecycle').first.inner_text()=='OPEN'
    assert not errors,errors
    print('PASS: wrong-buzz penalty, winning score, and full question-scoped rollback')
    page.close()
    page,errors=setup(penalty=True)
    for _ in range(len(buttons(page))):
        next_index=page.locator('ol.queue li').count()
        buttons(page)[next_index].click();page.locator('[data-act="judge-wrong"]').first.click()
    assert page.locator('.lifecycle').first.inner_text()=='LOCKED'
    page.locator('[data-act="reveal"]').first.click()
    assert page.locator('.lifecycle').first.inner_text()=='MARKED'
    page.locator('[data-act="finalise-zero"]').first.click()
    assert page.locator('.lifecycle').first.inner_text()=='FINALISED'
    for b in buttons(page): assert score(page,b.get_attribute('data-id'))==-1
    page.locator('[data-act="reopen-current"]').first.click();page.locator('#askYes').click()
    for b in buttons(page): assert score(page,b.get_attribute('data-id'))==0
    assert not errors,errors
    print('PASS: all wrong -> reveal -> no-correct finalise -> rollback of penalties')
    page.close()
    page,errors=setup(penalty=True)
    ids=[b.get_attribute('data-id') for b in buttons(page)]
    buttons(page)[0].click();page.locator('[data-act="judge-wrong"]').first.click()
    page.locator('[data-act="buzz-clear"]').first.click()
    assert score(page,ids[0])==0
    assert page.locator('ol.queue li').count()==0
    assert not errors,errors
    print('PASS: manual restart of buzzer attempts reverses provisional penalty')
    page.close()
    # Timer expiry: no late entrants and no reset to a fresh timer after it expires.
    page,errors=setup()
    page.locator('[data-act="timer-reset"]').first.click()
    page.wait_for_timeout(200)
    # Force near-expiry via saved state, simulating elapsed time rather than waiting for 20 seconds.
    page.evaluate("""() => { const s=JSON.parse(window.__store.get('pqp.v1')); s.timer.running=true; s.timer.end=Date.now()+250; s.timer.rem=.25; window.__store.set('pqp.v1',JSON.stringify(s)); window.dispatchEvent(new StorageEvent('storage',{key:'pqp.v1',newValue:JSON.stringify(s)})); }""")
    page.wait_for_timeout(850)
    assert page.locator('.lifecycle').first.inner_text()=='LOCKED'
    buttons(page)[0].click()
    assert page.locator('ol.queue li').count()==0
    page.locator('[data-act="buzz-toggle"]').first.click()
    assert page.locator('.lifecycle').first.inner_text()=='LOCKED','expired question cannot be force-reopened without timer reset'
    assert not errors,errors
    print('PASS: timer expiry closes exclusive buzzers and rejects reopening')
    page.close()
    browser.close()
