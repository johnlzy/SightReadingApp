import {test,expect} from '@playwright/test';

test('child can open both hands on a stationary score without false grade',async({page})=>{
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.addInitScript(()=>{
  const user={name:'Reading Explorer',avatar:'🦊',difficulty:'pro',
   credits:8,lastLogin:new Date().toDateString(),instruments:['piano'],
   tCoins:10,bCoins:20,unlockedSongs:3,
   scores:{coin:{easy:[],medium:[],hard:[],pro:[]},songs:{}},
   readingLevel:8};
  localStorage.setItem('fsr_users_v2',JSON.stringify([user]));
 });
 await page.goto('/');
 await page.locator('#overlay-start button').click();
 await page.locator('#screen-register .user-btn').first().click();
 await page.locator('#screen-landing .menu-card').filter({hasText:'Two-Staff Piece'}).click();
 await expect(page.locator('#screen-audition.active')).toBeVisible();
 await expect(page.locator('#audition-heading')).toContainText('Two-Staff');
 await expect(page.locator('#grand-score-actions')).toBeVisible();
 await expect(page.locator('#audition-keys')).toBeHidden();
 const staffCount=await page.locator('#audition-score .grand-staff').count();
 expect(staffCount).toBeGreaterThanOrEqual(2);
 await expect(page.locator('#audition-score [data-clef="treble"]').first()).toBeVisible();
 await expect(page.locator('#audition-score [data-clef="bass"]').first()).toBeVisible();
 await expect(page.locator('#audition-status')).toContainText('not graded automatically');
 const initial=await page.locator('#audition-score').innerHTML();
 await page.locator('#grand-page-next').click();
 await expect(page.locator('#grand-page-label')).toContainText('Page 2');
 const later=await page.locator('#audition-score').innerHTML();
 expect(later).not.toBe(initial);
 const outcome=await page.evaluate(async()=>{
  const {state}=await import('/js/state.js');
  return {readingLevel:state.currentUser.readingLevel,
   sparks:state.currentUser.economy.sparks,
   checkCount:state.currentUser.learning.checkCount};
 });
 await page.getByRole('button',{name:'Finished playing'}).click();
 await expect(page.locator('#screen-landing.active')).toBeVisible();
 const after=await page.evaluate(async()=>{
  const {state}=await import('/js/state.js');
  return {readingLevel:state.currentUser.readingLevel,
   sparks:state.currentUser.economy.sparks,
   checkCount:state.currentUser.learning.checkCount};
 });
 expect(after).toEqual(outcome);
 expect(errors).toEqual([]);
});
