<p align="center">
  <img src="../icon/icon2048.png" alt="PlainTab Logo" width="92">
</p>

<h1 align="center">PlainTab</h1>

<p align="center">
  صفحة تبويب جديدة سريعة وهادئة ومرتكزة على الخلفيات لمتصفحي Chrome و Edge.
</p>

<p align="center">
  <a href="../README.md">English</a> · <a href="https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo">Chrome Web Store</a> · <a href="https://plaintab.kaininx.workers.dev">تجربة مباشرة</a> · <a href="technical/README_en.md">ملاحظات تقنية</a> · <a href="changelog-i18n/ar.txt">سجل التغييرات</a>
</p>

<p align="center">
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/version-3.2.1-111827?style=flat-square" alt="Version 3.2.1">
  <img src="https://img.shields.io/badge/Manifest-V3-4285f4?style=flat-square&logo=googlechrome" alt="Manifest V3">
  <img src="https://img.shields.io/badge/No_Build_Step-00a884?style=flat-square" alt="لا يحتاج إلى بناء">
  <img src="https://img.shields.io/badge/Vanilla-JS-f7df1e?style=flat-square&logo=javascript&logoColor=111827" alt="Vanilla JavaScript">
</p>

<div align="center">
  <img src="../imgs/chrome_01.png" width="45%" alt="لقطة شاشة PlainTab 1" />
  <img src="../imgs/chrome_02.png" width="45%" alt="لقطة شاشة PlainTab 2" />
  <br>
  <img src="../imgs/chrome_03.png" width="45%" alt="لقطة شاشة PlainTab 3" />
  <img src="../imgs/chrome_04.png" width="45%" alt="لقطة شاشة PlainTab 4" />
</div>

## ما هو PlainTab

PlainTab هو امتداد Manifest V3 لصفحة التبويب الجديدة في Chrome و Edge. يستبدل الصفحة الافتراضية بخلفية نظيفة، وشريط بحث قابل للتخصيص، واختصارات تبقى بعيدة عن الواجهة إلى أن تحتاج إليها.

صُمم لمن يريد صفحة بداية هادئة وسريعة: بلا موجز أخبار، بلا بطاقات ترويجية، بلا نظام حسابات، وبلا لوحة مليئة بالودجت. افتح تبويبًا جديدًا، شاهد الخلفية، ابحث أو اكتب رابطًا، ثم أكمل يومك.

يمكن تشغيل الصفحة نفسها كصفحة ويب مستقلة بفتح `index.html` مباشرة، لذلك يسهل تجربة المشروع وقراءة شفرته وتعديله.

## جرّبه

### التثبيت

[ثبّت PlainTab من Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)

### التجربة المباشرة

[plaintab.kaininx.workers.dev](https://plaintab.kaininx.workers.dev)

### التشغيل محليًا

```bash
git clone https://github.com/kaininx/PlainTab.git
```

وضع الامتداد:

1. افتح `chrome://extensions`.
2. فعّل وضع المطوّر.
3. اختر "Load unpacked".
4. اختر مجلد مشروع PlainTab.

وضع الويب:

افتح `index.html` مباشرة في المتصفح.

لا توجد تبعيات، ولا مدير حزم، ولا خطوة بناء.

## لماذا PlainTab

### الخلفية أولًا، وانتظار أبيض أقل

يهتم PlainTab بإحساس ظهور الخلفية فور فتح تبويب جديد. يحفظ معاينة خفيفة في `localStorage`، ثم يؤجل تحميل الخلفية الكامل والتخزين المؤقت واستخراج ألوان السمة إلى ما بعد الرسم الأول.

السرعة المحسوسة هنا جزء من تجربة المنتج، وليست مجرد رقم أداء.

### هادئ افتراضيًا

تبقى الصفحة الرئيسية بسيطة: خلفية، بحث، وعدد قليل من عناصر التحكم. الاختصارات، والروابط المخفية، والإعدادات، والنسخ الاحتياطية، وخيارات الخلفية المتقدمة موجودة، لكنها لا تملأ الشاشة منذ البداية.

### مصادر خلفيات مرنة

يمكنك استخدام خلفية Bing اليومية، أو Wallhaven، أو صور مرفوعة، أو مجلد محلي، أو RSS، أو API صور خاص بك، أو خلفيات فيديو. PlainTab بسيط للاستخدام اليومي ومرن لمن يحب التخصيص.

### بحث واختصارات بلا فوضى

يمكن ضبط موضع شريط البحث وحجمه وزواياه وشفافيته وطريقة ظهوره وسجل البحث وسلوك محرك البحث. الاختصارات تعيش داخل لوحة الأوامر، حيث يمكنك البحث والإضافة والتعديل والاستيراد والإخفاء.

## الميزات

| الميزة | الوصف |
|--------|-------|
| استبدال التبويب الجديد | يستبدل صفحة التبويب الجديدة بعد التثبيت |
| وضع ويب مستقل | يعمل من `index.html` دون تغليف الامتداد |
| بدء سريع للخلفية | يقلل الوميض الأبيض عبر معاينة مبكرة |
| خلفية Bing | يدعم خلفية Bing اليومية |
| خلفية Wallhaven | يدعم التصفح والاختيار عبر Wallhaven |
| خلفيات محلية | رفع صور، معرض، واختيار مجلد محلي |
| خلفيات RSS / API | يربط مصادر صور وواجهات API مخصصة |
| خلفيات فيديو | يسمح باستخدام الفيديو كخلفية |
| شريط البحث | موضع، حجم، نمط، شفافية، وطريقة ظهور قابلة للتعديل |
| سجل البحث | حفظ عمليات البحث الأخيرة أو إيقافها |
| لوحة الأوامر | إدارة الاختصارات دون ازدحام الصفحة الرئيسية |
| مساحة مخفية | روابط متاحة لكنها غير ظاهرة على الواجهة |
| لوحة الإعدادات | الواجهة، الخلفيات، الاختصارات، البيانات، واللغة |
| النسخ الاحتياطي والاستعادة | استيراد، تصدير، ونسخ احتياطي مشفّر |
| واجهة متعددة اللغات | تتضمن 16 حزمة لغة |
| أثر تعاون AI | ملاحظات ووثائق من التطوير بمساعدة AI |

<div align="center">
  <img src="../imgs/chrome_05.png" width="45%" alt="لقطة شاشة إعدادات PlainTab 1" />
  <img src="../imgs/chrome_06.png" width="45%" alt="لقطة شاشة إعدادات PlainTab 2" />
</div>

## للمطورين

PlainTab يستخدم تقنية بسيطة عمدًا:

- JavaScript عادي، CSS، وواجهات المتصفح.
- لا يوجد `npm`، ولا `package.json`، ولا framework، ولا bundler.
- قاعدة كود واحدة لوضع الامتداد ووضع الويب.
- إعداد Manifest V3 في `manifest.json`.
- سكربتات التشغيل تُحمّل مباشرة من `index.html`.

نقاط بداية مفيدة: [الملاحظات التقنية](technical/README_en.md)، [ملاحظات الإصدارات](RELEASE_NOTES.md)، [تشخيص الذاكرة والتخزين](ai-tasks/20260519-memory-storage-diagnostic-report.md)، [تعليمات وكلاء AI](../AGENTS.md).

المناطق الحساسة: مسار بدء التشغيل، عرض الخلفية بطبقتين، البيانات الكبيرة في IndexedDB، توافق مفاتيح localStorage، وصلاحيات Chrome Web Store.

## بنية المشروع

```text
PlainTab/
├── index.html              # التبويب الجديد ومدخل الويب
├── manifest.json           # Manifest الخاص بـ Chrome / Edge
├── css/                    # أنماط مقسمة حسب الميزة
├── js/                     # وحدات التشغيل
├── js/wallpaper/           # الخلفيات والمصادر واستخراج السمة
├── wasm/                   # محرك السمة وسكربتات البناء
├── _locales/               # رسائل i18n للامتداد
├── docs/                   # الوثائق وملاحظات الإصدارات
├── icon/                   # الأيقونات
└── imgs/                   # لقطات الشاشة ومواد المتجر
```

## ما الذي يتجنبه PlainTab

سيبقى PlainTab هادئًا ومحدودًا. ليست ضمن الاتجاه الحالي: موجزات الأخبار، الترندات، التوصيات، إعلانات البداية، البطاقات الممولة، لوحات الطقس/التقويم/المهام الكبيرة، الحسابات، الميزات الاجتماعية، تدفقات المحتوى السحابي، عشرات الاختصارات المثبتة، أو محتوى ترويجي يعمل تلقائيًا.

لا توجد خطة حالية لإصدار Safari، لأن النشر والصيانة ليسا واقعيين لمشروع شخصي في هذه المرحلة.

## التعاون مع AI والتعلّم

طُوّر PlainTab بمساعدة AI في كتابة الكود، والتوثيق، وإعادة التنظيم، وتجهيز الإصدارات، والتشخيص. ليس مجرد عرض تجريبي: لديه واجهة حقيقية، إعدادات محفوظة، استيراد/تصدير، تخزين خلفيات، تعدد لغات، ومسارا تشغيل للامتداد والويب.

يفيد في دراسة بناء امتداد تبويب جديد، وتنظيم frontend صغير بلا framework، وتوثيق التطوير بمساعدة AI، وكيف تؤثر بساطة المنتج في القرارات التقنية.

## خارطة الطريق

قد يتطور PlainTab نحو مصادر خلفيات أكثر استقرارًا، وتدفقات إعداد أسلس، ووثائق تقنية أوضح، وسجل أكمل للتطوير بمساعدة AI، وربما دعم Firefox إذا سمحت واجهات API وتكلفة الصيانة.

## المساهمة

نرحب بـ issues و pull requests، خصوصًا في توافق المتصفحات، ومصادر الخلفيات، والوثائق، والتحسينات الصغيرة للواجهة.

قبل تغيير بدء التشغيل، أو الخلفيات، أو التخزين، أو البحث، أو الإعدادات، أو لوحة الأوامر، اقرأ [AGENTS.md](../AGENTS.md) والقواعد داخل `.claude/rules/`. التغييرات الصغيرة والمركزة هي الأفضل.

## اللغات

<details>
<summary>ترجمات README</summary>

- [English](../README.md)
- [简体中文](README_zh-CN.md)
- [繁體中文](README_zh-TW.md)
- [हिन्दी](README_hi.md)
- [Español](README_es.md)
- العربية
- [Français](README_fr.md)
- [Português](README_pt_BR.md)
- [Русский](README_ru.md)
- [Deutsch](README_de.md)
- [日本語](README_ja.md)
- [Italiano](README_it.md)
- [Türkçe](README_tr.md)
- [Tiếng Việt](README_vi.md)
- [한국어](README_ko.md)
- [Polski](README_pl.md)

</details>

## روابط ذات صلة

- [سجل التغييرات](changelog-i18n/ar.txt)
- [ملاحظات الإصدارات المفصلة](RELEASE_NOTES.md)
- [الملاحظات التقنية](technical/README_en.md)
- [تشخيص الذاكرة والتخزين](ai-tasks/20260519-memory-storage-diagnostic-report.md)
- [التجربة المباشرة](https://plaintab.kaininx.workers.dev)
- [Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)
- [GitHub](https://github.com/kaininx/PlainTab)

## الترخيص

PlainTab مفتوح المصدر بموجب [رخصة MIT](../LICENSE).

أنشأه ويصونه [Kaelri](https://github.com/kaininx).
