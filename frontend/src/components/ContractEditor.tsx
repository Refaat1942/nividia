'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';

type Field = { id: string; key: string; label: string; value: string };

interface Props {
  /** API path returning { html, title, saved? } */
  loadPath: string;
  /** API path for PUT (save) / DELETE (reset). Omit for fill-and-print without saving. */
  savePath?: string;
  backHref: string;
}

/** Fill the blanks of a contract, edit any of its text, and print it. */
export default function ContractEditor({ loadPath, savePath, backHref }: Props) {
  const docRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const collect = useCallback(() => {
    const spans = docRef.current?.querySelectorAll<HTMLElement>('[data-fill]') || [];
    const seen = new Set<string>();
    const list: Field[] = [];
    spans.forEach((s) => {
      const key = s.dataset.key || '';
      // Blanks sharing a key (e.g. customer name in the contract and in the declaration) get one input.
      const group = key || `#${s.dataset.fill}`;
      if (seen.has(group)) return;
      seen.add(group);
      list.push({ id: s.dataset.fill || '', key, label: s.dataset.label || 'حقل', value: s.textContent || '' });
    });
    setFields(list);
  }, []);

  const setDocument = useCallback((html: string) => {
    if (docRef.current) docRef.current.innerHTML = html;
    collect();
  }, [collect]);

  useEffect(() => {
    setLoading(true);
    api<any>(loadPath)
      .then((d) => {
        setTitle(d.title || 'عقد');
        setDocument(d.html || '');
        setDirty(false);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'فشل تحميل العقد'))
      .finally(() => setLoading(false));
  }, [loadPath, setDocument]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty && savePath) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, savePath]);

  function spansFor(field: Field): HTMLElement[] {
    const root = docRef.current;
    if (!root) return [];
    const selector = field.key ? `[data-fill][data-key="${CSS.escape(field.key)}"]` : `[data-fill="${CSS.escape(field.id)}"]`;
    return Array.from(root.querySelectorAll<HTMLElement>(selector));
  }

  function updateField(field: Field, value: string) {
    spansFor(field).forEach((s) => { s.textContent = value; });
    setFields((prev) => prev.map((f) => (f.id === field.id ? { ...f, value } : f)));
    setDirty(true);
  }

  function focusField(field: Field) {
    const span = spansFor(field)[0];
    if (!span) return;
    span.scrollIntoView({ behavior: 'smooth', block: 'center' });
    span.classList.add('fill-active');
    setTimeout(() => span.classList.remove('fill-active'), 1200);
  }

  function exec(command: string, value?: string) {
    docRef.current?.focus();
    document.execCommand(command, false, value);
    setDirty(true);
    collect();
  }

  async function save(): Promise<boolean> {
    if (!savePath || !docRef.current) return false;
    setSaving(true);
    setError('');
    try {
      await api(savePath, { method: 'PUT', body: JSON.stringify({ html: docRef.current.innerHTML }) });
      setDirty(false);
      setMessage('تم حفظ العقد');
      setTimeout(() => setMessage(''), 2500);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الحفظ');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function print() {
    if (savePath && dirty) await save();
    window.print();
  }

  async function reset() {
    if (!confirm('استعادة نص القالب الأصلي؟ ستفقد كل التعديلات على النص.')) return;
    try {
      const d = savePath
        ? await api<any>(savePath, { method: 'DELETE' })
        : await api<any>(loadPath);
      setDocument(d.html || '');
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الاستعادة');
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      save();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      print();
    }
  }

  const emptyCount = fields.filter((f) => !f.value.trim()).length;
  const toolBtn = 'px-3 py-1.5 rounded-md border border-slate-300 bg-white text-sm hover:bg-slate-100';

  return (
    <Layout>
      <div onKeyDown={onKeyDown}>
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <Link href={backHref} className="text-sm text-primary hover:underline">→ العودة للعقود</Link>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-slate-500 text-sm">
              املأ الفراغات من القائمة، أو اضغط على أي نص في العقد لتعديله مباشرة، ثم اطبع.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {savePath && (
              <span className={`text-sm ${dirty ? 'text-amber-600' : 'text-green-600'}`}>
                {dirty ? 'تغييرات غير محفوظة' : 'محفوظ'}
              </span>
            )}
            {savePath && (
              <button onClick={save} disabled={saving || !dirty} className="btn-secondary disabled:opacity-50">
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            )}
            <button onClick={print} disabled={loading} className="btn-primary">طباعة</button>
          </div>
        </div>

        {message && <div className="print:hidden card mb-4 bg-green-50 text-green-700 text-sm py-3">{message}</div>}
        {error && <div className="print:hidden card mb-4 bg-red-50 text-red-700 text-sm py-3">{error}</div>}

        <div className="flex flex-col xl:flex-row gap-6 items-start">
          <aside className="print:hidden w-full xl:w-80 shrink-0 card p-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">الفراغات</h3>
              <span className={`text-xs ${emptyCount ? 'text-amber-600' : 'text-green-600'}`}>
                {emptyCount ? `${emptyCount} فارغ` : 'مكتمل'}
              </span>
            </div>
            <div className="space-y-3">
              {fields.map((f) => (
                <label key={f.id} className="block">
                  <span className="text-xs text-slate-500">{f.label}</span>
                  <input
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={f.value}
                    onFocus={() => focusField(f)}
                    onChange={(e) => updateField(f, e.target.value)}
                  />
                </label>
              ))}
              {!loading && !fields.length && <p className="text-sm text-slate-500">لا توجد فراغات في هذا العقد</p>}
            </div>
            <div className="border-t mt-4 pt-4 space-y-2">
              <h4 className="text-sm font-semibold">تنسيق النص المحدد</h4>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={`${toolBtn} font-bold`} onMouseDown={(e) => { e.preventDefault(); exec('bold'); }}>B</button>
                <button type="button" className={`${toolBtn} underline`} onMouseDown={(e) => { e.preventDefault(); exec('underline'); }}>U</button>
                <button type="button" className={toolBtn} onMouseDown={(e) => { e.preventDefault(); exec('justifyRight'); }}>يمين</button>
                <button type="button" className={toolBtn} onMouseDown={(e) => { e.preventDefault(); exec('justifyCenter'); }}>توسيط</button>
                <button type="button" className={toolBtn} onMouseDown={(e) => { e.preventDefault(); exec('undo'); }}>تراجع</button>
                <button type="button" className={toolBtn} onMouseDown={(e) => { e.preventDefault(); exec('redo'); }}>إعادة</button>
                <button type="button" className={toolBtn} onMouseDown={(e) => { e.preventDefault(); exec('insertHTML', '<div class="page-break"></div><p><br></p>'); }}>فاصل صفحة</button>
              </div>
              <button type="button" onClick={reset} className="text-sm text-red-600 hover:underline">استعادة نص القالب الأصلي</button>
            </div>
          </aside>

          <div className="flex-1 w-full overflow-x-auto print:overflow-visible">
            <div className="contract-sheet">
              {loading && <p className="text-slate-500 text-sm">جاري تحميل العقد...</p>}
              <div
                ref={docRef}
                className="contract-doc outline-none"
                contentEditable={!loading}
                suppressContentEditableWarning
                spellCheck={false}
                onInput={() => { setDirty(true); collect(); }}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
