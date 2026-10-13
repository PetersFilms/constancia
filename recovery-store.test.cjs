const test=require('node:test'),assert=require('node:assert/strict');
const {IDBFactory}=require('fake-indexeddb'),Recovery=require('./recovery-store.js');
test('large recoveries roundtrip byte exact through IndexedDB without touching earlier local copies',async()=>{
 const local=new Map([['constancia.v1','original-state'],['constancia.recovery.before-first-sync','earlier-raw']]);
 const storage={getItem:k=>local.get(k)??null,setItem:()=>{throw new DOMException('Full','QuotaExceededError');}},indexedDB=new IDBFactory();
 const recovery=new Recovery({storage,indexedDB}),raw=JSON.stringify({version:1,description:'Recuperação fictícia, sem perdas. '.repeat(100000)},null,2);
 await recovery.save('constancia.recovery.before-first-sync',raw);assert.equal(await new Recovery({storage,indexedDB}).read('constancia.recovery.before-first-sync'),raw);
 assert.equal(local.get('constancia.v1'),'original-state');assert.equal(local.get('constancia.recovery.before-first-sync'),'earlier-raw');
 assert.equal(await recovery.read('missing'),null);
});
test('legacy recovery remains downloadable and environments without IndexedDB retain the old storage behavior',async()=>{
 const local=new Map([['old','legacy-json']]),storage={getItem:k=>local.get(k)??null,setItem:(k,v)=>local.set(k,v)};
 const recovery=new Recovery({storage,indexedDB:new IDBFactory()});assert.equal(await recovery.read('old'),'legacy-json');
 const fallback=new Recovery({storage});await fallback.save('new','full-json');assert.equal(await fallback.read('new'),'full-json');
 storage.setItem=()=>{throw Error('full');};await assert.rejects(fallback.save('blocked','do-not-save'),/full/);assert.equal(local.has('blocked'),false);
});
