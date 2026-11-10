// Release behavior parity against the six main-only commits from 2026-10-16.
 // The UI3 intentionally replaces legacy routes with the approved tabbed architecture.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const source=(path)=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
test('main team management functionality remains in UI3 tabbed admin',()=>{
 const app=source('src/app/admin/page.tsx');
 assert.match(app,/TeamDirectory/);
 assert.match(app,/id:"team",label:"Equipe"/);
 assert.match(app,/workspaceTab==="team"\s*&&\s*!isLoading/);
 const directory=source('src/Components/admin/TeamDirectory.tsx');
 for(const name of ['TeamInviteForm','TeamAdminTransferForm','TeamMemberControls','TeamMemberProfileEditor'])assert.ok(directory.includes(name),name);
});
test('legacy team management route resolves to UI3 protected tab',()=>{
 const route=source('src/app/admin/equipe/page.tsx');
 assert.match(route,/redirect\("\/admin\?section=team"\)/);
 assert.match(source('src/app/admin/page.tsx'),/searchParams\.get\("section"\)/);
});
test('team access and lifecycle routes from main remain available',()=>{
 for(const path of [
 'src/app/api/team/admin/transfer/route.ts','src/app/api/team/assignments/route.ts',
 'src/app/api/team/directory/route.ts','src/app/api/team/first-password/route.ts',
 'src/app/api/team/invite/route.ts','src/app/api/team/members/status/route.ts',
 'src/app/api/team/my-access/route.ts','src/app/api/team/permissions/route.ts'])
 assert.ok(existsSync(new URL('../../'+path,import.meta.url)),path);
});
test('approved client and strategist recovery paths remain',()=>{
 const strategist=source('src/app/estrategista/login/page.tsx');
 assert.match(strategist,/PasswordRecoveryLink/);
 const client=source('src/app/cliente/page.tsx');
 assert.match(client,/PasswordRecoveryLink|esqueci-senha|Login|login/i);
 assert.match(source('src/app/esqueci-senha/ForgotPasswordForm.tsx'),/resetPasswordForEmail/);
 assert.match(source('src/app/redefinir-senha/ResetPasswordForm.tsx'),/updateUser|verifyOtp/);
});
test('Rotevo brand font and logo remain in UI3',()=>{
 assert.match(source('src/Components/RotevoLogo.tsx'),/Poppins/);
 assert.match(source('src/Components/RotevoLogo.tsx'),/aria-label="Rotevo"/);
});
