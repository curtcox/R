import {createRequire} from 'node:module';
const {catalog}=createRequire(import.meta.url)('./src/examples.js');
export default {
  catalog:catalog.map(sample=>({id:sample.id,title:sample.label,tags:sample.tags,description:sample.description,document:{src:sample.src,r:{stdin:sample.stdin||'',autorun:true}},cover:'gallery/previews/'+sample.id+'.svg'})),
  output:'gallery/covers',dependencies:['src/examples.js','src/r-core.js','src/r/runtime.R','scripts/render-r-previews.mjs',...catalog.map(sample=>'gallery/previews/'+sample.id+'.svg')],
  async renderCover(page,example){await page.goto(new URL(example.cover,process.env.GALLERY_BASE_URL??'http://127.0.0.1:8000/').href);return page.locator('svg');}
};
