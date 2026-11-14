import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
test("client details use centered responsive modal with accessible close affordance",()=>{
 const text=read("src/Components/admin/ClientsDirectory.tsx");
 assert.match(text,/aria-labelledby="ui3-client-details-title"/);
 assert.match(text,/max-h-\[92dvh\].*max-w-\[760px\]/);
 assert.match(text,/aria-label="Fechar detalhes do cliente" title="Fechar"/);
 assert.doesNotMatch(text,/max-w-\[640px\] overflow-y-auto bg-white p-5 shadow-xl sm:p-6/);
});
test("onboarding uses central dialog, per-client resolved avatar and launch icon",()=>{
 const text=read("src/Components/admin/OperationalHubs.tsx");
 assert.match(text,/aria-labelledby="ui3-onboarding-dialog-title"/);
 assert.match(text,/clientPhotos\[/);
 assert.match(text,/external-link/);
 assert.match(text,/max-h-\[92dvh\].*max-w-\[860px\]/);
});
test("strategist user button presents readable name and photo on white header",()=>{
 const text=read("src/Components/admin/AdminUserMenu.tsx");
 assert.match(text,/text-\[#323647\]/);
 assert.match(text,/\{display\}<\/span>/);
 assert.match(text,/chevron-down/);
 assert.doesNotMatch(text,/border-white\/20/);
});
