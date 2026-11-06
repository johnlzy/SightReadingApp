import {test,expect} from '@playwright/test';

async function enter(page){
    await page.addInitScript(()=>{
        const child={
            name:'Keyboard Comfort',avatar:'🐱',difficulty:'easy',
            credits:12,lastLogin:new Date().toDateString(),
            instruments:['piano'],tCoins:0,bCoins:0,unlockedSongs:2,
            scores:{coin:{easy:[],medium:[],hard:[],pro:[]},songs:{}}
        };
        localStorage.setItem('fsr_users_v2',JSON.stringify([child]));
    });
    await page.goto('/');
    await page.locator('#overlay-start button').click();
    await page.locator('#screen-register .user-btn').first().click();
    await expect(page.locator('#screen-landing.active')).toBeVisible();
}

test('first concert has comfortably sized keys without another settings step',async({page})=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await enter(page);
    await page.locator('#journey-btn').click();
    await expect(page.locator('#screen-audition.active')).toBeVisible();
    const widths=await page.locator('#audition-keys .white-key').evaluateAll(
        keys=>keys.map(k=>k.getBoundingClientRect().width)
    );
    expect(widths.length).toBeGreaterThan(2);
    expect(Math.min(...widths)).toBeGreaterThanOrEqual(45);
    expect(Math.max(...widths)).toBeLessThanOrEqual(67);
    await expect(page.locator('#keyboard-size-toggle')).toHaveCount(0);
    expect(errors).toEqual([]);
});

test('natural key sizing also works in beginner mode without stretching five notes',async({page})=>{
    await enter(page);
    await page.evaluate(()=>window.startGame('coin'));
    const metrics=await page.locator('#keyboard').evaluate(k=>{
        const rect=k.getBoundingClientRect();
        const keys=Array.from(k.querySelectorAll('.white-key'));
        return {
            screenWidth:rect.width,
            keyWidth:keys[0].getBoundingClientRect().width,
            keybedWidth:k.querySelector('.keyboard-keys').getBoundingClientRect().width,
            scrollWidth:k.scrollWidth
        };
    });
    expect(metrics.keyWidth).toBeGreaterThanOrEqual(45);
    expect(metrics.keyWidth).toBeLessThanOrEqual(67);
    // The beginner keyboard is not artificially stretched into enormous keys.
    expect(metrics.keybedWidth).toBeLessThanOrEqual(metrics.screenWidth+1);
    await expect(page.locator('#keyboard-range-label')).toContainText('Piano');
});
