import { describe, expect, it } from 'vitest';
import app from './App.tsx?raw';
import worker from '../worker/index.ts?raw';

describe('tokenized H5 shares', () => {
  it('opens issue and patrol shares without waiting for a login session', () => {
    expect(app).toContain("route.kind === 'patrol') return <InspectionPage route={route} />");
    expect(app).toContain("route.kind === 'share') return <IssuePage route={route} user={null} />");
    expect(app).toContain('分享页面仅供查看');
  });

  it('keeps raw internal issue and inspection routes authenticated', () => {
    expect(worker).toContain("if (patrolApi[1] === 'inspections') return await proxyAuthenticated");
    expect(worker).toContain("return await proxyAuthenticated(request, env, `/issues/${id}`)");
  });

  it('rewrites report photos to token-scoped public media URLs', () => {
    expect(worker).toContain('rewriteSharedMedia');
    expect(worker).toContain('/share-media/${kind}/${encodeURIComponent(token)}/${encodeURIComponent(source.id)}/content');
    expect(worker).toContain('/${publicMedia[1]}-shares/${encodeURIComponent(publicMedia[2])}/media/');
  });
});
