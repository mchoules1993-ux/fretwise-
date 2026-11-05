'use strict';
// Guards the orange amp look: colours live in CSS only.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const site=f=>fs.readFileSync(path.join(__dirname,'..','site',f),'utf8');

// 1. Colours live in CSS only, so the look can change in one place.
for(const f of ['app.js','listen.js','navigation.js','chords.js']){
  assert.doesNotMatch(site(f),/(?<!&)#[0-9a-fA-F]{6}\b|(?<!&)#[0-9a-fA-F]{3}\b(?![\w-])/,`${f} must not hard-code colours`);
}

console.log('theme: ok');
