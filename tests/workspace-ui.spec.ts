import {test,expect,Page} from '@playwright/test';
import {signIn} from './helpers';
const roles=['super_admin','admin','hq_manager','app_franchise_manager','delivery_staff','digester_franchise_admin','digester_staff','warehouse_manager','collector'];
for(const role of roles)test(`role navigation and endpoint boundaries: ${role}`,async({page})=>{
 await signIn(page,role);
 const identity=await (await page.request.get('/api/v1/auth/me/')).json();
 const canBill=identity.capabilities.includes('bills');
 await expect(page.locator('nav').getByRole('button',{name:'Transactions',exact:true})).toHaveCount(canBill?1:0);
 expect((await page.request.get('/api/v1/bills/')).status()).toBe(canBill?200:403);
 expect((await page.request.get('/api/v1/products/')).status()).toBe(identity.capabilities.includes('products')?200:403);
 await page.goto('/?screen=settings');
 if(!identity.capabilities.includes('settings'))await expect(page.getByRole('heading',{name:'Access unavailable'})).toBeVisible();
});
const book='11111111-1111-4111-8111-111111111111',customer='22222222-2222-4222-8222-222222222222',product='33333333-3333-4333-8333-333333333333',bill='44444444-4444-4444-8444-444444444444';
async function mock(page:Page){
 const requests:{path:string;key:string;data:any}[]=[];let row:any=null;const lost=new Set<string>();let failReads=false;
 await page.route('**/api/**',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname;let data:any={count:0,page:1,page_size:50,results:[],summary:{}};
  if(path.includes('auth/me'))data={id:1,name:'UI Reviewer',email:'review@example.test',role:'super_admin',role_label:'Super Admin',franchise:null,franchise_name:'Head office',permission_version:1,capabilities:['dashboard','bills','bill.write','payments','customers','customer.create','products','categories','rates','team']};
  else if(path.includes('auth/csrf'))data={csrfToken:'fixture'};
  else if(path.endsWith('/events'))return route.fulfill({contentType:'text/event-stream',body:'event: ready\ndata: {}\n\n'});
  else if(path.includes('options'))data={franchises:[{id:book,name:'Review HQ',kind:'hq'}],products:[{id:product,name:'Paper',unit:'kg',franchises:[book]}],categories:[],staff:[],drivers:[],warehouses:[]};
  else if(path.includes('dashboard'))data={metrics:[],franchises:[],summary:{today:'100',month:'100',incoming_outstanding:'0',outgoing_outstanding:'100',share_owed:'0'},cancellations:0};
  else if(path.includes('search'))data={results:url.searchParams.get('q')==='nothing'?[]:[{id:customer,screen:'customers',type:'Customer',name:'Review customer',detail:'Review HQ'}]};
  else if(path.includes('/customers/'+customer))data={id:customer,name:'Review customer',phone:'7000000000'};
  else if(path.includes('/customers/'))data={...data,count:1,results:[{id:customer,name:'Review customer',phone:'7000000000'}]};
  else if(path.includes('/bills/')&&req.method()==='POST'){
   const body=req.postDataJSON(),key=req.headers()['idempotency-key'];requests.push({path,key,data:body});
   if(!lost.has(path)){
    lost.add(path);
    if(path.endsWith('/issue/'))row={...row,state:'issued',number:'TEST-001',version:2};
    else if(path.endsWith('/pay/'))row={...row,state:'completed',settled:'100',outstanding:'0',version:3};
    else row={...body,id:bill,state:'draft',subtotal:'100',tax:'0',total:'100',settled:'0',outstanding:'100',version:1};
    return route.abort('failed');
   }
   data=row;
  }else if(path.includes('/bills/'+bill))data=row;
  else if(path.includes('/bills/')){if(failReads)return route.fulfill({status:503,json:{detail:'Read unavailable'}});data={...data,date_basis:'created_at'};}
  else if(path.includes('pricing'))data={results:[],franchises:[]};
  else if(path.includes('team'))data={results:[],roles:[],targets:[]};
  await route.fulfill({json:data});
 });
 return {requests,fail:()=>{failReads=true}};
}
test('lost save, issue and payment responses recover with the original keys',async({page})=>{
 const state=await mock(page);await page.goto('/?screen=new-transaction');
 await page.getByRole('radio').check();await page.getByLabel('Material',{exact:true}).selectOption(product);await page.getByLabel('Quantity',{exact:true}).fill('10');
 page.once('dialog',dialog=>dialog.dismiss());await page.locator('nav').getByRole('button',{name:'Dashboard',exact:true}).click();await expect(page.getByRole('heading',{name:'New head-office collection'})).toBeVisible();
 await page.getByRole('button',{name:'Save as draft',exact:true}).click();
 await expect(page.getByRole('button',{name:'Recover save result'})).toBeVisible();await page.locator('nav').getByRole('button',{name:'Dashboard',exact:true}).click();await expect(page.getByRole('heading',{name:'New head-office collection'})).toBeVisible();
 await page.getByRole('button',{name:'Recover save result'}).click();
 await expect(page.getByText('Draft saved. Review the total before issuing.')).toBeVisible();
 await page.getByRole('button',{name:'Review & issue invoice'}).click();await page.getByRole('button',{name:'Recover issue result'}).click();
 await expect(page.getByRole('heading',{name:'Transaction · TEST-001'})).toBeVisible();
 await page.getByRole('button',{name:'Full amount',exact:true}).click();await page.getByRole('button',{name:'Record payment',exact:true}).click();await page.getByRole('button',{name:'Recover pay result'}).click();
 await expect(page.getByText('Payment recorded.')).toBeVisible();
 expect(state.requests).toHaveLength(6);
 for(let i=0;i<6;i+=2){expect(state.requests[i].key).toBe(state.requests[i+1].key);expect(state.requests[i].data).toEqual(state.requests[i+1].data)}
 expect(state.requests.filter(r=>r.path.endsWith('/issue/'))).toHaveLength(2);
});
test('deep links replace stale preferences and all-time removes old dates',async({page})=>{
 await mock(page);await page.goto('/?screen=bills');
 await page.getByLabel('Period',{exact:true}).selectOption('custom');await page.getByLabel('From',{exact:true}).fill('2026-01-01');await page.getByLabel('To',{exact:true}).fill('2026-01-02');
 const request=page.waitForRequest(r=>r.url().includes('/bills/?')&&!new URL(r.url()).searchParams.has('from')&&!new URL(r.url()).searchParams.has('to'));
 await page.getByLabel('Period',{exact:true}).selectOption('');await page.reload();await request;
 await page.getByLabel('Search',{exact:true}).fill('stale');await page.goto('/?screen=bills&period=today&issued=1&financial_only=1');
 await expect(page.getByLabel('Search',{exact:true})).toHaveValue('');
 await expect(page.getByLabel('Period',{exact:true})).toHaveValue('today');
});
test('keyboard search opens the authorized record and dialog restores focus',async({page})=>{
 await mock(page);await page.goto('/');const search=page.getByRole('textbox',{name:'Search workspace'});await search.fill('Review');
 const result=page.getByRole('button',{name:'Review customer Customer · Review HQ'});await expect(result).toBeVisible();await result.focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('heading',{name:'Customers',exact:true})).toBeFocused();
 await search.fill('nothing');await expect(page.getByText('No matching records.')).toBeVisible();
});
test('drawer, tabs, responsive tables and zoom remain usable',async({page})=>{
 await mock(page);
 for(const width of [390,768,1440]){
  await page.setViewportSize({width,height:900});await page.goto('/?screen=products');await expect(page.getByRole('heading',{name:'Products & categories'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('tab',{name:'Products',exact:true}).focus();await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'Categories',exact:true})).toHaveAttribute('aria-selected','true');
  if(width<901){await page.getByRole('button',{name:'Open navigation'}).click();await expect(page.locator('.sidebar')).toHaveClass(/open/);await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Open navigation'})).toBeFocused();}
 }
 await page.evaluate(()=>document.documentElement.style.zoom='2');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('empty and failed register reads do not invent financial balances',async({page})=>{
 const state=await mock(page);await page.goto('/?screen=bills');await expect(page.getByText('No records match these filters.')).toBeVisible();state.fail();await page.reload();await expect(page.locator('main').getByRole('alert')).toContainText('Read unavailable',{timeout:15000});await expect(page.getByRole('region',{name:'Summary'})).toHaveCount(0);
});

test('long financial values stay inside mobile table and summary containers',async({page})=>{
 await mock(page);await page.route('**/api/v1/dashboard/',route=>route.fulfill({json:{cancellations:0,summary:{today:'1234567890123.45',month:'1234567890123.45',incoming_outstanding:'1234567890123.45',outgoing_outstanding:'1234567890123.45',share_owed:'1234567890123.45'},franchises:[{id:book,name:'A very long franchise name across multiple districts and collection areas',kind:'scrap',today:'1234567890123.45',month:'1234567890123.45',count:10000,receivable:'1234567890123.45',payable:'1234567890123.45',share_owed:null}]}}));
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.getByRole('heading',{name:'Franchise totals'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.locator('.table-scroll').evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);
});
