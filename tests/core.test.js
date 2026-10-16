import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, eligible, choose, elapsed, completeSession, validateState, achievements, localDate, uuid } from '../public/core.js';
const activity=(overrides={})=>({id:'test-activity',title:'Ler o livro que ando a adiar',description:'Começar um capítulo.',minutes:30,effort:2,category:'lazer',photo:'',steps:['Abrir o livro'],createdAt:'2026-10-01T12:00:00Z',postponedSince:'2026-09-01T12:00:00Z',...overrides});
const session=(overrides={})=>({activityId:'test-activity',status:'running',mode:'full',elapsedMs:60000,runningSince:100000,checked:[],...overrides});
test('O sorteio respeita simultaneamente tempo, esforço, categoria e estado',()=>{
 const items=[activity(),activity({id:'short',minutes:10,effort:1}),activity({id:'hard',minutes:10,effort:3}),activity({id:'home',minutes:10,category:'casa'}),activity({id:'done',minutes:10,completedAt:'2026-10-15T12:00:00Z'})];
 assert.deepEqual(eligible(items,15,2,'lazer').map(a=>a.id),['short']);
 assert.equal(choose(items,15,2,'lazer',()=>0).id,'short');
 assert.equal(choose(items,1,1),null);
});
test('O sorteio alcança os extremos do conjunto elegível sem escolher fora do conjunto',()=>{
 const items=[activity({id:'one'}),activity({id:'two'}),activity({id:'three'})];
 assert.equal(choose(items,30,2,'all',()=>0).id,'one');
 assert.equal(choose(items,30,2,'all',()=>.999999).id,'three');
});
test('O cronómetro recupera tempo real após background/refresh e respeita pausas',()=>{
 assert.equal(elapsed(session(),160000),120000);
 assert.equal(elapsed(session({runningSince:null,elapsedMs:45000}),999999),45000);
 assert.equal(elapsed(session({runningSince:100000,elapsedMs:0}),90000),0);
});
test('Uma sessão de cinco minutos parcial fica no histórico sem concluir a atividade',()=>{
 const state=freshState();state.activities=[activity()];state.mission=session({mode:'five'});
 const entry=completeSession(state,{done:false,mood:3},340000);
 assert.equal(entry.elapsedMs,300000);assert.equal(entry.mode,'five');assert.equal(state.activities[0].completedAt,undefined);assert.equal(state.mission,null);
 assert.equal(state.history.length,1);assert.equal(achievements(state.history)[1].unlocked,true);
 assert.equal(achievements(state.history)[0].unlocked,false);
});
test('Concluir uma atividade retira-a dos elegíveis e impede dupla conclusão',()=>{
 const state=freshState();state.activities=[activity()];state.mission=session();
 completeSession(state,{done:true,mood:4},160000);
 assert.equal(eligible(state.activities,60,3).length,0);
 assert.equal(achievements(state.history).find(a=>a.name==='Tempo para mim').unlocked,true);
 assert.throws(()=>completeSession(state,{done:true,mood:4},160001));assert.equal(state.history.length,1);
 assert.doesNotThrow(()=>validateState(state));
});
test('Backup preserva fotos, passos, missão pausada e histórico num round trip',()=>{
 const state=freshState();state.activities=[activity({photo:'data:image/jpeg;base64,YWJjZA=='})];state.mission=session({runningSince:null,checked:[0]});
 const restored=validateState(JSON.parse(JSON.stringify(state)));assert.deepEqual(restored,state);
});
test('Importação rejeita IDs injetáveis, URLs externos, categorias e referências inválidas',()=>{
 for(const patch of [{id:'x\" onclick=\"evil()'},{photo:'https://example.com/track.jpg'},{category:'__proto__'},{effort:0},{minutes:Infinity},{steps:Array(13).fill('step')}]){
  const state=freshState();state.activities=[activity(patch)];assert.throws(()=>validateState(state));
 }
 const state=freshState();state.activities=[activity()];state.mission=session({activityId:'missing'});assert.throws(()=>validateState(state));
});
test('Conquistas usam dias distintos e dados reais em vez de sessões repetidas no mesmo dia',()=>{
 const history=Array.from({length:5},(_,i)=>({done:true,category:'casa',mode:'full',elapsedMs:60000,localDay:'2026-10-16'}));
 assert.equal(achievements(history)[2].unlocked,true);assert.equal(achievements(history)[4].unlocked,false);
 history.push({...history[0],localDay:'2026-10-15'},{...history[0],localDay:'2026-10-14'});
 assert.equal(achievements(history)[4].unlocked,true);
});
test('Datas usam o dia local e IDs têm formato compatível com backups',()=>{
 const d=new Date(2026,9,16,0,1);assert.equal(localDate(d),'2026-10-16');assert.match(uuid(),/^[a-f0-9-]{36}$/);
});
