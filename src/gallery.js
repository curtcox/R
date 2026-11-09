import {mountGallery,createStorage} from '../vendor/fragment-kit-v0.4.3/src/index.js';
import {createAi,createAiSettings,createSampleChooser,handleAiCallback} from '../vendor/fragment-kit-v0.4.3/src/ai/index.js';
import {urlState,config,type} from './fragment-config.mjs';
const container=document.getElementById('gallery');
let callback=false,error;try{callback=handleAiCallback();}catch(e){error=e;}
if(error){const status=document.createElement('p');status.setAttribute('role','status');status.textContent=error.message;container.append(status);}
if(!callback&&!error){
const links={build:doc=>urlState.build(doc,{url:new URL('./',location.href).href})};
const catalog=RExamples.catalog.map(sample=>({id:sample.id,title:sample.label,tags:sample.tags,description:sample.description,document:{src:sample.src,r:{stdin:sample.stdin||'',autorun:true}},cover:'gallery/covers/'+sample.id+'.png'}));
const ai=await createAi({config,type,storage:createStorage({prefix:config.storagePrefix})});
const chooser=createSampleChooser({ai,catalog,urlState:links,container});
if(ai)createAiSettings({ai,container,onChange:()=>void chooser.refresh()});
const gallery=mountGallery({container,urlState:links,catalog});
container.querySelector('.fk-gallery-filters input').id='search';container.querySelector('.fk-gallery-filters select').id='tag';
}
