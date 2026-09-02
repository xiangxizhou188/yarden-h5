import { useRef, useState, type ChangeEvent } from 'react';
import { api } from './api';
import type { MediaAsset, MediaScope } from './types';

async function compressPhoto(file: File) {
  const bitmap = await createImageBitmap(file);
  const maxEdge = 2048;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器无法处理照片');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
  if (!blob) throw new Error('照片压缩失败');
  return blob;
}

export function PhotoGallery({ photos }: { photos: MediaAsset[] }) {
  const [active, setActive] = useState<number | null>(null);
  const visibleIndex = active === null || !photos.length ? null : Math.min(active, photos.length - 1);
  return <>
    <div className="photo-grid">{photos.map((photo, index) => <button type="button" className="photo-thumb" key={photo.id} onClick={() => setActive(index)}><img src={`/api${photo.thumbnailUrl}`} alt={`照片 ${index + 1}`} loading="lazy" /></button>)}</div>
    {visibleIndex !== null && photos[visibleIndex] ? <div className="photo-viewer" role="dialog" aria-modal="true" aria-label="图片预览" onClick={() => setActive(null)}>
      <div className="photo-viewer-head"><span>{visibleIndex + 1} / {photos.length}</span><button type="button" aria-label="关闭图片" onClick={() => setActive(null)}>×</button></div>
      <img src={`/api${photos[visibleIndex].url}`} alt={`照片 ${visibleIndex + 1}`} onClick={(event) => event.stopPropagation()} />
      {photos.length > 1 ? <div className="photo-viewer-nav"><button type="button" disabled={visibleIndex === 0} onClick={(event) => { event.stopPropagation(); setActive(Math.max(0, visibleIndex - 1)); }}>‹</button><button type="button" disabled={visibleIndex === photos.length - 1} onClick={(event) => { event.stopPropagation(); setActive(Math.min(photos.length - 1, visibleIndex + 1)); }}>›</button></div> : null}
    </div> : null}
  </>;
}

export function PhotoUploader({ value, onChange, scope, entityId, disabled = false }: { value: MediaAsset[]; onChange: (photos: MediaAsset[]) => void; scope: MediaScope; entityId: string; disabled?: boolean }) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const select = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).slice(0, Math.max(0, 6 - value.length));
    event.target.value = '';
    if (!files.length) return;
    setBusy(true); setError('');
    const uploaded: MediaAsset[] = [];
    try {
      for (const file of files) {
        const blob = await compressPhoto(file);
        uploaded.push(await api.uploadMedia(blob, file.name.replace(/\.[^.]+$/, '.jpg'), scope, entityId));
      }
      onChange([...value, ...uploaded]);
    } catch (caught) {
      onChange([...value, ...uploaded]);
      setError(caught instanceof Error ? caught.message : '照片上传失败');
    } finally { setBusy(false); }
  };
  const remove = async (photo: MediaAsset) => {
    if (!confirm('确认删除这张照片吗？')) return;
    setBusy(true); setError('');
    try { await api.deleteMedia(photo.id); onChange(value.filter(item => item.id !== photo.id)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : '照片删除失败'); }
    finally { setBusy(false); }
  };
  return <div className="photo-uploader"><PhotoGallery photos={value} />{!disabled && value.length < 6 ? <><input ref={cameraInput} hidden type="file" accept="image/*" capture="environment" onChange={(event) => void select(event)} /><input ref={libraryInput} hidden type="file" accept="image/*" multiple onChange={(event) => void select(event)} /><div className="photo-add-actions"><button type="button" className="photo-add" disabled={busy} onClick={() => cameraInput.current?.click()}>{busy ? '正在压缩并上传…' : '拍照'}</button><button type="button" className="photo-add secondary" disabled={busy} onClick={() => libraryInput.current?.click()}>从相册选择</button></div></> : null}{!disabled && value.length ? <div className="photo-remove-row">{value.map((photo, index) => <button type="button" key={photo.id} disabled={busy} onClick={() => void remove(photo)}>删除第 {index + 1} 张</button>)}</div> : null}{error ? <p className="form-error">{error}</p> : null}</div>;
}
