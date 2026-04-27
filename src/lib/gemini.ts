import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PROMPT_TEMPLATE = `Sen bir yapı denetim ve mimari belge inceleme uzmanısın. Görevin, yüklenen kamu belgelerini ve onay evraklarını inceleyerek tarihlerini ve belge sayılarını belirtilen kurallara göre hatasız çekmektir.

Aranacak ve Listeye Eklenebilecek Geçerli Belge Türleri (SADECE BUNLARI ARAMALISIN):
- İŞ BİTİRME TUTANAĞI
- KONTR GABARİ BELGESİ
- YAPI APLİKASYON PROJESİ
- İSKİ KANAL BAĞLANTI YAZISI
- CİNS TASHİHİ YAZISI
- SOSYAL GÜVENLİK KURUMU YAZISI
- YANGIN RAPORU
- MAKİNE VE ELEKTRİK TESİSAT MUAYENE RAPORU
- ISI YALITIM MUAYENE RAPORU
- TOPRAKLAMA ÖLÇÜM RAPORU
- İSKAN RAPORU
- ASANSÖR TESCİL BELGESİ
- ASANSÖR PERİYODİK TAKİP/KONTROL FORMU

Kurallar:
1. SADECE yukarıdaki listede yer alan belge türlerini çıktıya dahil et. Belge yüklü PDF'lerde yoksa ekleme. "Yapı Ruhsatı" vb. liste dışı hiçbir evrakı KESİNLİKLE listeye ekleme.
2. İş Bitirme Tutanağı'nda net bir tarih bulamazsan, tarih kısmını "..................." şeklinde yap (Örn: "1-)................... TARİH VE 2314446 YİBF NOLU İŞ BİTİRME TUTANAĞI.").
3. Belge sayılarının veya barkod numaralarının çok uzun olması ve tire (-) içermesi durumunda, KESİNLİKLE SADECE tireden sonraki son sayı grubunu belge sayısı olarak kabul et (Örn: Belgede sayı 113833346-360410 ise sen formata "360410" olarak yaz).
4. Formattaki cümle yapısını koru (Örn: "[Tarih] TARİH VE [Sayı] SAYILI [Belge Adı]"). Bir belgenin sayısı veya numarası yoksa sadece "TARİHLİ" ibaresini kullan (Örn: "01.12.2022 TARİHLİ YANGIN RAPORU.").
5. Her bir numaralandırılmış maddeyi ve sondaki cümleyi YENİ BİR SATIRA (alt satıra) yazıp, aralarında alt alta inecek şekilde formatla. (Örn: \n ile ayır).
6. Hangi belge sırasının eksik olduğuna bakılmaksızın ve belgelerin geliş sırasından bağımsız olarak listelemeni düzgün ardışık bir sayı sırasında yap (1-), 2-), 3-) diye ilerlesin).
7. Listenin en son cümlesi olarak her zaman mutlak suretle listeye en son yeni bir satıra "YUKARIDAKİ BELGELERE İSTİNADEN DÜZENLENMİŞTİR." eklemek zorundasın.
8. Başlangıçta veya bitişte "Merhaba", "İşte sonuç" vb. HİÇBİR sohbet metni ekleme. Kesinlikle doğrudan listeyi ver.

Örnek Çıktı Formatı (Alt alta satırlar halinde):
1-)................... TARİH VE 2314446 YİBF NOLU İŞ BİTİRME TUTANAĞI.
2-)28.01.2026 TARİH VE 113847392 SAYILI KONTR GABARİ BELGESİ.
3-)26.03.2026 VE 375808 SAYILI TARİHLİ YAPI APLİKASYON PROJESİ.
4-)02.02.2026 TARİH VE 3224722 SAYILI İSKİ KANAL BAĞLANTI YAZISI.
5-)12.03.2026 TARİH VE 373606 SAYILI CİNS TASHİHİ YAZISI.
6-)25.03.2026 TARİH VE 138569220 SAYILI SOSYAL GÜVENLİK KURUMU YAZISI.
7-)26.01.2026 TARİHLİ YANGIN RAPORU.
8-)15.12.2025 TARİHLİ MAKİNE VE ELEKTRİK TESİSAT MUAYENE RAPORU.
9-)15.12.2025 TARİHLİ ISI YALITIM MUAYENE RAPORU.
10-)23.01.2026 TARİHLİ TOPRAKLAMA ÖLÇÜM RAPORU.
11-)15.08.2024 TARİHLİ İSKAN RAPORU.
12-)15.01.2026 TARİH VE 360410 SAYILI ASANSÖR TESCİL BELGESİ.
YUKARIDAKİ BELGELERE İSTİNADEN DÜZENLENMİŞTİR.`;

export async function analyzeDocuments(files: File[]): Promise<string> {
  try {
    const parts = await Promise.all(
      files.map(async (file) => {
        const base64 = await fileToBase64(file);
        return {
          inlineData: {
            data: base64.split(",")[1], // Strip the data URL prefix "data:application/pdf;base64,"
            mimeType: file.type,
          },
        };
      })
    );

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro', // Best model for complex document reasoning
      contents: [
        { role: 'user', parts: [{ text: PROMPT_TEMPLATE }, ...parts] }
      ],
      config: {
          temperature: 0.1 // We need high accuracy formatting and extraction.
      }
    });

    return response.text || "Sonuç oluşturulamadı.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}
