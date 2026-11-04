import {mountGallery} from '../vendor/fragment-kit-v0.3.1/src/index.js';
import {urlState} from './fragment-config.mjs';
mountGallery({container:document.getElementById('gallery'),catalog:RExamples.catalog.map(sample=>({id:sample.id,title:sample.label,tags:sample.tags,description:sample.description,document:{src:sample.src,r:{stdin:sample.stdin||'',autorun:true}},cover:'gallery/covers/'+sample.id+'.png'})),urlState:{build:doc=>urlState.build(doc,{url:new URL('./',location.href).href})}});
document.querySelector('.fk-gallery-filters input').id='search';document.querySelector('.fk-gallery-filters select').id='tag';
