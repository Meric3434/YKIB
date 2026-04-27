/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UploadCloud,
  FileText,
  Trash2,
  Copy,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileSearch,
  Download,
} from 'lucide-react';
import { analyzeDocuments } from './lib/gemini';

const MAX_FILES = 10;
const MAX_TOTAL_SIZE_MB = 15; // To safely respect payload limits

const HEATING_ERROR_TEXT = `İmar ve Şehircilik Müdürlüğümüzün 26.01.2026 tarih ve 363000 sayılı yazısına istinaden ruhsat eki onaylı projesinde ısıtma sisteminin "Kombi (Bireysel)" olarak tasdik edilmiş olmasına rağmen yapı ruhsatında sehven "Bina İçi Kalorifer" olarak işaretlendiğinden dolayı MAKS sisteminin başka bir seçeneğe izin vermemesi sebebiyle "Merkezi Isıtmalı Kalorifer" olarak işaretlenmiştir. Yapının ısıtma sistemi "Kombi (Bireysel)" dir.`;

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSize = files.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024);

  const handleFileSelect = (newFiles: File[]) => {
    setError(null);
    const pdfFiles = newFiles.filter((f) => f.type === 'application/pdf');
    
    if (pdfFiles.length !== newFiles.length) {
      setError('Sadece PDF dosyaları yükleyebilirsiniz.');
    }

    if (files.length + pdfFiles.length > MAX_FILES) {
      setError(`En fazla ${MAX_FILES} dosya yükleyebilirsiniz.`);
      return;
    }

    setFiles((prev) => [...prev, ...pdfFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (files.length === 1) {
      // Re-evaluating after deleting the last one
      setResult(null);
    }
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    if (totalSize > MAX_TOTAL_SIZE_MB) {
      setError(`Toplam dosya boyutu ${MAX_TOTAL_SIZE_MB}MB'ı aşamaz (Şu an: ${totalSize.toFixed(1)}MB).`);
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setError(null);

    try {
      const generatedText = await analyzeDocuments(files);
      setResult(generatedText);
    } catch (err) {
      console.error(err);
      setError('Belgeler incelenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleExportWord = () => {
    if (!result) return;
    
    const lines = result.split('\n').filter(line => line.trim() !== '');
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Evrak Listesi</title>
      </head>
      <body style="font-family: Arial, sans-serif; font-size: 11pt;">
        ${lines.map(line => `<p style="margin: 0 0 8px 0;">${line}</p>`).join('')}
      </body>
      </html>
    `;
    
    // BOM for UTF-8 compatibility
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Evrak_Listesi.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAddHeatingErrorText = () => {
    if (!result || result.includes(HEATING_ERROR_TEXT)) return;
    
    setResult((prev) => {
      if (!prev) return prev;
      return prev.trim() + '\n\n' + HEATING_ERROR_TEXT;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col text-slate-800 underline-offset-4 selection:bg-blue-100 selection:text-blue-900">
      {/* Header Navigation */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm">B</div>
          <div>
            <h1 className="text-lg font-bold leading-tight">BelgeOtomasyon v2.4</h1>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Yapı İzin Belgesi Analiz Sistemi</p>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <nav className="hidden sm:flex space-x-4 text-sm font-medium text-slate-600">
            <span className="text-blue-600 border-b-2 border-blue-600 pb-1 cursor-pointer">Analiz</span>
            <span className="cursor-pointer hover:text-slate-800 transition-colors">Arşiv</span>
            <span className="cursor-pointer hover:text-slate-800 transition-colors">Şablonlar</span>
          </nav>
          <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300"></div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row p-4 sm:p-6 gap-6 max-w-[1400px] mx-auto w-full">
        {/* Left Panel: File Selection & Upload */}
        <section className="w-full lg:w-1/3 flex flex-col space-y-6">
          <div 
            className={`bg-white rounded-xl p-6 shadow-sm flex flex-col items-center justify-center border-dashed border-2 h-64 transition-all duration-200 relative cursor-pointer
              ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}
              ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              multiple 
              accept="application/pdf"
              className="hidden" 
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files) handleFileSelect(Array.from(e.target.files));
                if (e.target) e.target.value = '';
              }}
            />
            
            <svg className={`w-12 h-12 mb-4 transition-colors ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
            <p className="text-sm font-medium text-slate-700">Taranmış PDF Yükle</p>
            <p className="text-xs text-slate-400 mt-1 mb-6">veya buraya sürükleyin</p>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-colors pointer-events-none">
              Dosya Seç
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 flex flex-col max-h-[500px]">
             <div className="flex justify-between items-center shrink-0">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bekleyen Evraklar ({files.length})</h3>
              {totalSize > 0 && (
                <span className={`text-[10px] font-semibold uppercase tracking-tighter ${totalSize > MAX_TOTAL_SIZE_MB ? 'text-red-500' : 'text-slate-500'}`}>
                  {totalSize.toFixed(1)} MB / {MAX_TOTAL_SIZE_MB} MB
                </span>
              )}
            </div>
            
            <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar flex-1 min-h-[100px]">
              <AnimatePresence>
                {files.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-slate-400 text-center py-6 h-full flex items-center justify-center italic">
                    Henüz PDF yüklenmedi.
                  </motion.div>
                ) : files.map((file, i) => (
                  <motion.div 
                    key={`${file.name}-${i}`}
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95, overflow: 'hidden' }}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded border border-slate-100 group hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded flex shrink-0 items-center justify-center font-bold text-[10px]">PDF</div>
                      <span className="text-xs font-semibold truncate text-slate-700" title={file.name}>{file.name}</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      disabled={isProcessing}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1 shrink-0 opacity-0 group-hover:opacity-100 disabled:opacity-0"
                      title="Kaldır"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {files.length > 0 && (
              <button
                onClick={handleProcess}
                disabled={isProcessing || error !== null || totalSize > MAX_TOTAL_SIZE_MB}
                className="w-full mt-2 shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white shadow-lg shadow-blue-100 font-bold text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                {isProcessing && <Loader2 size={16} className="animate-spin" />}
                {isProcessing ? 'Analiz Ediliyor...' : (result ? 'Yeniden Analiz Et' : 'Belgeleri Analiz Et')}
              </button>
            )}
          </div>
        </section>

        {/* Right Panel: Processing Result */}
        <section className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-[500px]">
          <div className="border-b border-slate-100 px-6 py-4 flex justify-between items-center bg-slate-50/50 rounded-t-xl shrink-0">
            <h2 className="text-sm font-bold text-slate-800 flex items-center">
              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
              Otomatik Tanımlanan Liste Formatı
            </h2>
            {result && (
              <div className="flex space-x-2">
                <button 
                  onClick={handleCopy} 
                  className="text-xs bg-slate-100 px-3 py-1.5 rounded font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-colors flex items-center gap-1.5 border border-slate-200 shadow-sm"
                >
                  {copied ? <CheckCircle2 size={14} className="text-emerald-500"/> : <Copy size={14} />}
                  {copied ? 'Kopyalandı' : 'Kopyala'}
                </button>
              </div>
            )}
          </div>
          
          <div className="flex-1 p-6 flex flex-col min-h-0 bg-white">
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0, overflow: 'hidden' }}
                  className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3 text-sm shrink-0"
                >
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 bg-slate-900 rounded-lg p-6 h-full text-emerald-400 font-mono text-sm leading-relaxed border border-slate-800 relative flex flex-col overflow-hidden min-h-[300px] shadow-inner">
              {isProcessing ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <Loader2 size={32} className="animate-spin text-emerald-500" />
                  <p className="text-sm font-sans tracking-wide">Yapay zeka belgeleri tarayıp ayıklıyor...</p>
                </div>
              ) : result ? (
                <div className="flex flex-col h-full absolute inset-0 p-6 overflow-hidden">
                  <div className="mb-4 text-slate-500 italic text-xs font-sans shrink-0 border-b border-slate-800 pb-2 flex justify-between items-center">
                    <span>// OCR & YZ Çıktısı - Lütfen hatalı kısımları düzeltip onaylayın.</span>
                    <span className="text-[10px] text-slate-600 bg-slate-800 px-2 py-0.5 rounded">Metin Düzenlenebilir</span>
                  </div>
                  <textarea
                    className="flex-1 w-full bg-transparent resize-none border-0 outline-none text-slate-200 leading-relaxed custom-scrollbar font-mono focus:ring-0"
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                    spellCheck={false}
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 space-y-3 p-8 text-center text-sm font-sans">
                  <FileText size={36} className="text-slate-700 opacity-50" />
                  <p className="max-w-xs text-slate-500 leading-relaxed">PDF belgelerini yükleyip analizi başlattığınızda,<br/>istenen formattaki liste burada görüntülenecektir.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 rounded-b-xl flex justify-between items-center shrink-0">
            <div className="flex items-center space-x-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tighter">
                İşlenen Dosya: <span className="text-slate-800">{files.length}</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tighter hidden sm:inline">
                Tarih Formatı: <span className="text-slate-800">DD.MM.YYYY</span>
              </span>
            </div>
            {result && !isProcessing && (
              <div className="flex gap-2">
                <button 
                  onClick={handleAddHeatingErrorText}
                  disabled={result.includes(HEATING_ERROR_TEXT)}
                  className={`border text-[11px] font-bold px-3 py-1.5 rounded shadow-sm transition-colors uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                    result.includes(HEATING_ERROR_TEXT) 
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-70' 
                    : 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
                  }`}
                >
                  <AlertCircle size={14} />
                  Isıtma Hata Yazısı
                </button>
                <button 
                  onClick={handleCopy}
                  className="bg-white border border-slate-200 text-slate-700 text-[11px] font-bold px-3 py-1.5 rounded shadow-sm hover:bg-slate-50 transition-colors uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <Copy size={14} />
                  Kopyala
                </button>
                <button 
                  onClick={handleExportWord}
                  className="bg-emerald-600 text-white text-[11px] font-bold px-4 py-1.5 rounded shadow-sm hover:bg-emerald-700 transition-colors uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <Download size={14} />
                  Word Olarak İndir
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="px-4 sm:px-8 py-4 mt-auto bg-white border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[10px] font-semibold text-slate-400 uppercase tracking-widest gap-2 text-center sm:text-left">
        <span>Lisans: Kurumsal (Belediye/Mühendislik)</span>
        <div className="flex space-x-4 flex-wrap justify-center items-center">
          <span className="cursor-pointer hover:text-slate-600 transition-colors">Sürüm Notları</span>
          <span className="cursor-pointer hover:text-slate-600 transition-colors">Yardım Merkezi</span>
          <span className="text-slate-200 hidden sm:inline">|</span>
          <span className="text-slate-600 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
            Bağlantı Durumu: Stabil
          </span>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
      `}} />
    </div>
  );
}
