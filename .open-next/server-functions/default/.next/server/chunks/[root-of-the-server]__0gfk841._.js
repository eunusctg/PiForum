module.exports=[93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},34639,e=>{"use strict";var t=e.i(47909),r=e.i(74017),a=e.i(96250),n=e.i(59756),s=e.i(61916),o=e.i(74677),i=e.i(69741),l=e.i(16795),c=e.i(87718),d=e.i(95169),u=e.i(47587),p=e.i(66012),h=e.i(70101),v=e.i(26937),f=e.i(10372),m=e.i(93695);e.i(52474);var R=e.i(220);async function x(){return new Response(`
const CACHE = 'piforum-v2';
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Purge ALL old caches (including the old 'piforum-v1') so stale chunks
  // from a previous SW session are evicted immediately.
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Never cache API or admin requests
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;

  // Network-first for navigation (HTML), fallback to cache.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Network-first for _next/static dev chunks — Turbopack reuses chunk URLs
  // in dev so cache-first would serve stale intermediate builds. Always go
  // to the network first, fall back to cache only when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || Response.error()))
  );
});
`,{headers:{"Content-Type":"application/javascript; charset=utf-8","Cache-Control":"no-cache","Service-Worker-Allowed":"/"}})}e.s(["GET",0,x],32654);var w=e.i(32654);let E=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/sw.js/route",pathname:"/sw.js",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/sw.js/route.ts",nextConfigOutput:"standalone",userland:w,...{}}),{workAsyncStorage:g,workUnitAsyncStorage:C,serverHooks:y}=E;async function A(e,t,a){a.requestMeta&&(0,n.setRequestMeta)(e,a.requestMeta),E.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let x="/sw.js/route";x=x.replace(/\/index$/,"")||"/";let w=await E.prepare(e,t,{srcPage:x,multiZoneDraftMode:!1});if(!w)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:g,deploymentId:C,params:y,nextConfig:A,parsedUrl:k,isDraftMode:b,prerenderManifest:q,routerServerContext:P,isOnDemandRevalidate:T,revalidateOnlyGenerated:N,resolvedPathname:S,clientReferenceManifest:H,serverActionsManifest:_}=w,O=(0,i.normalizeAppPath)(x),j=!!(q.dynamicRoutes[O]||q.routes[S]),U=async()=>((null==P?void 0:P.render404)?await P.render404(e,t,k,!1):t.end("This page could not be found"),null);if(j&&!b){let e=!!q.routes[S],t=q.dynamicRoutes[O];if(t&&!1===t.fallback&&!e){if(A.adapterPath)return await U();throw new m.NoFallbackError}}let I=null;!j||E.isDev||b||(I="/index"===(I=S)?"/":I);let L=!0===E.isDev||!j,M=j&&!L;_&&H&&(0,o.setManifestsSingleton)({page:x,clientReferenceManifest:H,serverActionsManifest:_});let D=e.method||"GET",W=(0,s.getTracer)(),$=W.getActiveScopeSpan(),F=!!(null==P?void 0:P.isWrappedByNextServer),K=!!(0,n.getRequestMeta)(e,"minimalMode"),B=(0,n.getRequestMeta)(e,"incrementalCache")||await E.getIncrementalCache(e,A,q,K);null==B||B.resetRequestCache(),globalThis.__incrementalCache=B;let G={params:y,previewProps:q.preview,renderOpts:{experimental:{authInterrupts:!!A.experimental.authInterrupts},cacheComponents:!!A.cacheComponents,supportsDynamicResponse:L,incrementalCache:B,cacheLifeProfiles:A.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,n)=>E.onRequestError(e,t,a,n,P)},sharedContext:{buildId:g,deploymentId:C}},V=new l.NodeNextRequest(e),X=new l.NodeNextResponse(t),z=c.NextRequestAdapter.fromNodeNextRequest(V,(0,c.signalFromNodeResponse)(t));try{let n,o=async e=>E.handle(z,G).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=W.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==d.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${D} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t),n&&n!==e&&(n.setAttribute("http.route",a),n.updateName(t))}else e.updateName(`${D} ${x}`)}),i=async n=>{var s,i;let l=async({previousCacheEntry:r})=>{try{if(!K&&T&&N&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let s=await o(n);e.fetchMetrics=G.renderOpts.fetchMetrics;let i=G.renderOpts.pendingWaitUntil;i&&a.waitUntil&&(a.waitUntil(i),i=void 0);let l=G.renderOpts.collectedTags;if(!j)return await (0,p.sendResponse)(V,X,s,G.renderOpts.pendingWaitUntil),null;{let e=await s.blob(),t=(0,h.toNodeOutgoingHttpHeaders)(s.headers);l&&(t[f.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==G.renderOpts.collectedRevalidate&&!(G.renderOpts.collectedRevalidate>=f.INFINITE_CACHE)&&G.renderOpts.collectedRevalidate,a=void 0===G.renderOpts.collectedExpire||G.renderOpts.collectedExpire>=f.INFINITE_CACHE?void 0:G.renderOpts.collectedExpire;return{value:{kind:R.CachedRouteKind.APP_ROUTE,status:s.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await E.onRequestError(e,t,{routerKind:"App Router",routePath:x,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:T})},!1,P),t}},c=await E.handleResponse({req:e,nextConfig:A,cacheKey:I,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:q,isRoutePPREnabled:!1,isOnDemandRevalidate:T,revalidateOnlyGenerated:N,responseGenerator:l,waitUntil:a.waitUntil,isMinimalMode:K});if(!j)return null;if((null==c||null==(s=c.value)?void 0:s.kind)!==R.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==c||null==(i=c.value)?void 0:i.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});K||t.setHeader("x-nextjs-cache",T?"REVALIDATED":c.isMiss?"MISS":c.isStale?"STALE":"HIT"),b&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let d=(0,h.fromNodeOutgoingHttpHeaders)(c.value.headers);return K&&j||d.delete(f.NEXT_CACHE_TAGS_HEADER),!c.cacheControl||t.getHeader("Cache-Control")||d.get("Cache-Control")||d.set("Cache-Control",(0,v.getCacheControlHeader)(c.cacheControl)),await (0,p.sendResponse)(V,X,new Response(c.value.body,{headers:d,status:c.value.status||200})),null};F&&$?await i($):(n=W.getActiveScopeSpan(),await W.withPropagatedContext(e.headers,()=>W.trace(d.BaseServerSpan.handleRequest,{spanName:`${D} ${x}`,kind:s.SpanKind.SERVER,attributes:{"http.method":D,"http.target":e.url}},i),void 0,!F))}catch(t){if(t instanceof m.NoFallbackError||await E.onRequestError(e,t,{routerKind:"App Router",routePath:O,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:T})},!1,P),j)throw t;return await (0,p.sendResponse)(V,X,new Response(null,{status:500})),null}}e.s(["handler",0,A,"patchFetch",0,function(){return(0,a.patchFetch)({workAsyncStorage:g,workUnitAsyncStorage:C})},"routeModule",0,E,"serverHooks",0,y,"workAsyncStorage",0,g,"workUnitAsyncStorage",0,C],34639)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0gfk841._.js.map