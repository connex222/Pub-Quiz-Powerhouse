from playwright.sync_api import sync_playwright
from pathlib import Path
import os, time
ROOT=Path(__file__).resolve().parents[1]
os.chdir(ROOT)
html=(ROOT/'public/index.html').read_text()
html=html.replace('<script src="/socket.io/socket.io.js"></script>', '')
html=html.replace("function load(){", "function load(){")
html=html.replace("} catch (e) { return null; }\n}\nfunction save()", "} catch (e) { console.warn('LOAD_ERROR',e); return null; }\n}\nfunction save()")
for name in ('quiz-rules.js','quiz-lifecycle.js','show-buzzer.js'):
    html=html.replace(f'<script src="/{name}"></script>', '<script>'+ (ROOT/'public'/name).read_text() + '</script>')
# Security controls in the environment block all localhost URLs. Run document
# in an isolated browser page with an in-memory localStorage shim instead.
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':960})
    errs=[]
    page.on('console',lambda e: print('CONSOLE', e.type,e.text[:400]) if 'LOAD_ERROR' in e.text else None)
    page.on('pageerror',lambda e:errs.append(str(e)))
    page.on('console',lambda e: print('CONSOLE',e.type,e.text[:400]) if 'LOAD_ERROR' in e.text else None)
    page.goto('about:blank')
    page.evaluate("""() => {
      const values=new Map();
      const shim={getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k),clear:()=>values.clear()};
      Object.defineProperty(window,'localStorage',{configurable:true,value:shim});
      window.__testStore=values;
    }""")
    page.set_content(html, wait_until='domcontentloaded')
    page.locator('[data-act="start-quiz"]').first.click()
    assert page.locator('body.view-host').count()==1, 'Host did not open'
    assert page.locator('.lifecycle').first.inner_text()=='OPEN', 'Not open'
    team_count=page.locator('.score-row').count()
    assert team_count>=2, team_count
    print('Host initialises, teams:',team_count)
    # Determine answer letter from host answer card.
    correct_letter=page.locator('.answer-box .opt.right .opt-l').first.inner_text().strip()
    letters='ABCD'; good=letters.index(correct_letter)
    team_row=page.locator('.tap-row').first
    firstteam=team_row.locator('button[data-act="answer"]').first.get_attribute('data-id')
    team_row.locator(f'button[data-c="{good}"]').first.click()
    remaining=page.locator('.tap-row').first
    other=remaining.locator('button[data-act="answer"]').first.get_attribute('data-id')
    remaining.locator(f'button[data-c="{(good+1)%4}"]').first.click()
    page.locator('button[data-act="buzz-toggle"]').first.click()
    assert page.locator('.lifecycle').first.inner_text()=='LOCKED'
    page.locator('button[data-act="reveal"]').first.click()
    assert page.locator('.lifecycle').first.inner_text()=='MARKED'
    page.locator('button[data-act="award"]').first.click()
    assert page.locator('.lifecycle').first.inner_text()=='FINALISED'
    score=lambda i: int(page.locator('.score-row').filter(has=page.locator(f'button[data-id="{i}"]')).first.locator('.tscore').inner_text())
    assert score(firstteam)==1 and score(other)==0, (score(firstteam),score(other))
    page.locator('button[data-act="next"]').first.click()
    assert page.locator('.lifecycle').first.inner_text()=='OPEN'
    page.locator('button[data-act="prev"]').first.click()
    assert page.locator('.lifecycle').first.inner_text()=='FINALISED'
    assert page.locator('ol.queue li').count()==2, 'Answers lost on returning to old question'
    persisted=page.evaluate('Object.fromEntries(window.__testStore)')
    import json
    snap=json.loads(persisted.get('pqp.v1','{}'))
    print('before-refresh:',snap.get('pos'), 'num sessions',len(snap.get('questionSessions',{})), 'buzz len',len(snap.get('buzz',{}).get('order',[])), 'awards',len(snap.get('questionAwards',{})))
    page.close()
    page=browser.new_page(viewport={'width':1440,'height':960})
    page.on('pageerror',lambda e:errs.append(str(e)))
    page.on('console',lambda e: print('CONSOLE',e.type,e.text[:400]) if 'LOAD_ERROR' in e.text else None)
    page.goto('about:blank')
    page.evaluate("""data => {
      const values=new Map(Object.entries(data));
      const shim={getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k),clear:()=>values.clear()};
      Object.defineProperty(window,'localStorage',{configurable:true,value:shim});
      window.__testStore=values;
    }""", persisted)
    page.set_content(html, wait_until='domcontentloaded')
    page.locator('button[data-view="host"]').first.click()
    print('after-refresh rows',page.locator('ol.queue li').count(), 'phase count',page.locator('.lifecycle').count(), 'view',page.locator('body').get_attribute('class'), 'text',page.locator('main').inner_text()[:200], 'browser errors',errs[:2])
    assert page.locator('ol.queue li').count()==2, 'Answers lost on host refresh'
    page.locator('[data-act="reopen-current"]').first.click()
    page.locator('#askYes').click()
    assert score(firstteam)==0, 'Reopen did not reverse score'
    btn=page.locator(f'button[data-act="mark"][data-id="{firstteam}"][data-st="wrong"]').first
    btn.click()
    assert page.locator('button[data-act="finalise-zero"]').first.is_enabled(), 'Zero finalise unavailable'
    page.locator('button[data-act="finalise-zero"]').first.click()
    assert page.locator('.lifecycle').first.inner_text()=='FINALISED'
    page.locator('button[data-act="next"]').first.click()
    page.locator('button[data-act="prev"]').first.click()
    assert page.locator('.lifecycle').first.inner_text()=='FINALISED'
    assert score(firstteam)==0
    page.screenshot(path='/mnt/data/pubquiz_v33_alpha2/classic-host-test.png',full_page=True)
    print('PASS: answer -> lock -> reveal -> award -> next -> prev -> refresh -> reopen -> correct -> zero finalise -> replay')
    assert not errs, errs
    browser.close()

