const {chromium}=require('@playwright/test');
const fs=require('node:fs');
const stage=process.argv[2]||'baseline';
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1850,height:932}});
 let signed=false;
 const franchises=['North Yard','River Yard','Central Digester','West Digester','Scrappy Head Office','East Yard'].map((name,i)=>({id:'f'+(i+1),name,kind:i===4?'hq':i===2||i===3?'digester':'scrap',code:'FR-'+(i+1),status:'active',district:'Malappuram',owner_name:'Operations manager',staff_count:4,product_count:12,billing_total:'244825.70',today:i?'844':'3835',month:'244825.70',count:42,receivable:'7611.50',payable:'11428.50',share_owed:i===2||i===3?'12495':null}));
 const customers=['River Residency','Green Paper Works','Central Traders','Sunrise Apartments','Westside Stores','Harbor Materials','North Market','Garden Homes'].map((name,i)=>({id:'c'+i,name,customer_name:name,phone:'700000000'+i,franchise:'f1',franchise_name:'North Yard',active:true,transaction_count:43,billing_total:'84225',last_transaction:'2026-10-16T05:00:00Z'}));
 const products=['Newspaper','Cardboard','Plastic','Iron','Aluminium','Copper','Brass','Steel','Books & magazines'].map((name,i)=>({id:'p'+i,name,category:'cat1',category_name:'Scrap',unit:'kg',tax_percent:'5',default_price:String(10+i*12),active:true,franchises:['f1','f2'],updated_at:'2026-10-14T05:00:00Z',default:String(10+i*12),cells:franchises.map((b,j)=>({franchise:b.id,amount:j===2||j===3?null:String(10+i*12+j),override:j===1,eligible:j!==2&&j!==3}))}));
 const bills=customers.map((c,i)=>({...c,id:'b'+i,number:i===2?null:'SCR-2026-00'+(2343-i),customer_name:c.name,customer:c.id,kind:'sale',total:String(544+i*100),settled:i===3?'0':String(544+i*100),outstanding:i===3?'844':'0',created_at:'2026-10-16T05:00:00Z',issued_at:i===2?null:'2026-10-16T05:00:00Z',payment_state:i===2?'not_issued':i===3?'pending':'paid',state:i===2?'draft':i===3?'issued':'completed',creator_name:'Team member',items_text:'Newspaper, Cardboard',lines:[]}));
 const users=customers.slice(0,6).map((c,i)=>({id:i+2,name:'Team member '+(i+1),email:'member'+i+'@example.test',role:'delivery_staff',role_label:'Delivery Staff',franchise:'f1',franchise_name:'North Yard',is_active:true,last_login:'2026-10-16T05:00:00Z'}));
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url());const path=url.pathname;
  let data={count:0,page:1,page_size:50,results:[]};
  if(path.includes('auth/me')){if(!signed)return route.fulfill({status:403,json:{detail:'Sign in'}});data={id:1,name:'Workspace Reviewer',role:'admin',role_label:'Admin',franchise:null,franchise_name:'Head office',permission_version:1,capabilities:['dashboard','bills','bill.write','payments','earnings','customers','customer.create','franchises','team','products','categories','rates']};}
  else if(path.includes('options'))data={franchises,products,categories:[{id:'cat1',name:'Scrap'}],staff:users.map(u=>({id:String(u.id),name:u.name})),drivers:users.map(u=>({id:String(u.id),name:u.name,franchise:'f1'})),warehouses:[]};
  else if(path.endsWith('/events'))return route.fulfill({contentType:'text/event-stream',body:'event: ready\ndata: {}\n\n'});
  else if(path.includes('dashboard'))data={metrics:[{label:'Receive from customers · outstanding',value:'67756',unit:'INR',href:'bills'}],bills,franchises,summary:{today:'4679',month:'830000',incoming_outstanding:'67756',outgoing_outstanding:'397215.20',share_owed:'29169'},cancellations:4};
  else if(path.includes('payouts'))data={balance:'29169',can_payout:true,results:[],franchises:franchises.slice(2,4).map(f=>({...f,share_percent:'25',billed:'328160',collected:'362369.60',earned:'82040',paid:'69545',balance:'12495'})),summary:{billed:'477240',collected:'516683.20',earned:'111856',paid:'82687',balance:'29169'}};
  else if(path.includes('pricing'))data={franchises,results:products};
  else if(path.includes('team'))data={results:users,roles:[{id:'delivery_staff',name:'Delivery Staff',permissions:['bills','customers']}],targets:['delivery_staff']};
  else if(path.includes('/bills/'))data={count:bills.length,page:1,page_size:50,date_basis:'issued_at',results:bills.filter(b=>url.searchParams.get('issued')!=='1'||b.state!=='draft'),summary:{incoming_total:'1534727.20',incoming_settled:'1197308.10',incoming_outstanding:'337419.10',outgoing_outstanding:'20000'}};
  else if(path.includes('/customers/'))data={count:customers.length,page:1,page_size:50,results:customers};
  else if(path.includes('/franchises/'))data={count:franchises.length,page:1,page_size:50,results:franchises};
  else if(path.includes('/products/'))data={count:products.length,page:1,page_size:50,results:products};
  else if(path.includes('/payments/'))data={count:bills.length,page:1,page_size:50,results:bills.map((b,i)=>({...b,id:'pay'+i,bill:b.id,bill_number:b.number,method:i%2?'Cash':'UPI',actor_name:'Team member',amount:b.total,paid_at:b.created_at,direction:'incoming'})),summary:{received:'1837.50',paid_out:'565000',receivable:'464971.20',payable:'20000',collection_ratio:'68.0'}};
  await route.fulfill({json:data});
 });
 await page.goto('http://127.0.0.1:3000');await page.getByRole('heading',{name:'Welcome back'}).waitFor();await page.evaluate(()=>document.fonts.ready);
 fs.mkdirSync(`visual-review/${stage}`,{recursive:true});
 if(!process.env.SCRAPPY_SKIP_AUTH_CAPTURE)await page.screenshot({path:`visual-review/${stage}/login.png`});
 await page.getByRole('button',{name:'Forgot your password?'}).click();if(!process.env.SCRAPPY_SKIP_AUTH_CAPTURE)await page.screenshot({path:`visual-review/${stage}/recovery.png`});
 signed=true;
 for(const screen of (stage==='baseline'?['dashboard','bills']:['dashboard','new-transaction','bills','invoices','payments','earnings','customers','franchises','team','products','rates'])){
  await page.goto('http://127.0.0.1:3000/?screen='+screen);await page.locator('main#workspace').waitFor();await page.waitForTimeout(700);await page.addStyleTag({content:'nextjs-portal{display:none}'});await page.screenshot({path:`visual-review/${stage}/${screen}.png`,fullPage:false});
 }
 await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:3000');await page.locator('main#workspace').waitFor();await page.screenshot({path:`visual-review/${stage}/mobile.png`,fullPage:true});
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Page overflow');
 if(stage==='updated'){
  for(const [name,width,screen,zoom] of [['mobile-transaction',390,'new-transaction',1],['tablet',768,'bills',1],['desktop1440',1440,'dashboard',1],['zoom200',1440,'products',2]]){
   await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:3000/?screen='+screen);await page.locator('main#workspace').waitFor();await page.waitForTimeout(500);await page.evaluate(z=>document.documentElement.style.zoom=String(z),zoom);
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(name+' page overflow');
   if(name==='mobile-transaction'){
    const fields=await page.locator('.ws-form-sections').boundingBox(),summary=await page.locator('.ws-payment-summary').boundingBox();
    if(summary.y<fields.y+fields.height)throw Error('Mobile transaction summary must follow its fields');
   }
   await page.screenshot({path:`visual-review/${stage}/${name}.png`,fullPage:true});
  }
 }
 await browser.close();
})();
