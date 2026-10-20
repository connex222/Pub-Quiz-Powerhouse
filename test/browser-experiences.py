from playwright.sync_api import sync_playwright
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'public/index.html').read_text().replace('<script src="/socket.io/socket.io.js"></script>', '')
for name in ('quiz-rules.js','quiz-lifecycle.js','show-buzzer.js'):
    html=html.replace(f'<script src="/{name}"></script>', '<script>'+ (ROOT/'public'/name).read_text() + '</script>')
store='''() => {const m=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}})}'''
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    # TV Game Show speed bonuses: fastest = base +2, second = base +1
    page=b.new_page(viewport={'width':1440,'height':1000})
    errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
    page.goto('about:blank');page.evaluate(store);page.set_content(html)
    page.locator('[data-act="set-experience"][data-experience="show"]').click()
    assert page.locator('[data-act="set-experience"][data-experience="show"]').get_attribute('aria-pressed')=='true'
    page.locator('[data-act="start-quiz"]').click()
    good='ABCD'.index(page.locator('.answer-box .opt.right .opt-l').first.inner_text().strip())
    a=page.locator('.tap-row').first
    first=a.locator('[data-act="answer"]').first.get_attribute('data-id')
    a.locator(f'[data-c="{good}"]').click()
    a=page.locator('.tap-row').first
    second=a.locator('[data-act="answer"]').first.get_attribute('data-id')
    a.locator(f'[data-c="{good}"]').click()
    page.locator('[data-act="reveal"]').first.click()
    page.locator('[data-act="award"]').first.click()
    scores={row.locator('button[data-act="score"]').first.get_attribute('data-id'):int(row.locator('.tscore').inner_text()) for row in page.locator('.score-row').all()}
    assert scores[first]==3 and scores[second]==2,scores
    assert not errs,errs
    print('PASS: Game Show 3/2 scoring')
    page.close()
    # Classic typed-answer host entry, then correct marking
    page=b.new_page(viewport={'width':1440,'height':1000})
    errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
    page.goto('about:blank');page.evaluate(store);page.set_content(html)
    selector=page.locator('[data-bind="round-field"][data-r="0"][data-f="mode"]').first
    selector.select_option('typed')
    page.locator('[data-act="start-quiz"]').click()
    assert page.locator('[data-act="host-typed"]').count()>=2
    correct=page.locator('.answer-box .a-text').first.inner_text().strip()
    page.locator('[data-act="host-typed"]').first.click()
    page.locator('#manualTypedAnswer').fill(correct)
    page.locator('#manualTypedSubmit').click()
    assert page.locator('ol.queue li').count()==1
    page.locator('[data-act="reveal"]').first.click()
    assert page.locator('[data-act="award"]').count()>0, 'Typed mark not considered correct'
    page.locator('[data-act="award"]').first.click()
    assert page.locator('.lifecycle').first.inner_text()=='FINALISED'
    assert not errs,errs
    print('PASS: Classic host-entered typed answer, automatic marking and award')
    page.close()
    # Unanswered Classic question: lock, reveal, finalise for zero.
    page=b.new_page(viewport={'width':1440,'height':1000})
    errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
    page.goto('about:blank');page.evaluate(store);page.set_content(html)
    page.locator('[data-act="start-quiz"]').click()
    page.locator('[data-act="next"]').first.click()
    assert 'Finalise' in page.locator('#toast').inner_text()
    page.locator('[data-act="reveal"]').first.click()
    page.locator('[data-act="finalise-zero"]').first.click()
    page.locator('[data-act="next"]').first.click()
    assert page.locator('.lifecycle').first.inner_text()=='OPEN'
    assert not errs,errs
    print('PASS: empty Classic question must be explicitly finalised for zero')
    b.close()
