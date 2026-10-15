import {test, expect} from '@playwright/test';
import {signIn} from './helpers';

test('Super Admin signs in with email and password without MFA',async({page})=>{
  await signIn(page,'super_admin');
  await expect(page.getByText('Verify your identity',{exact:true})).toHaveCount(0);
  await expect(page.getByLabel('Authentication or recovery code')).toHaveCount(0);
});
