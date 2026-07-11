# Replace Deeds — Native Android App (v2)

Ye ab ek **asal native Android project** hai (Capacitor framework se), taake:
- ✅ Alarms/Reminders **app band hone par bhi** kaam karein (native Android alarm system use karta hai)
- ✅ Real .apk file ban sake
- ✅ **Customize App** editor se buttons/text/emoji/image/card/toggle kahin bhi drag kar k rakh sakein, unka size/rang/rotation/glow-pulse-shimmer effect set kar sakein, aur unse action attach kar sakein (koi section kholna, habit tick karna, note kholna, ya test alarm bajana)

## Naya kya hai (is update mein)

1. **Real Native Alarms** — Settings → "Notification Permission" se Allow karein, phir "Test Alarm" se check karein. Habits aur Time Table ke reminders ab Android ke apne alarm system (`@capacitor/local-notifications`) se schedule hote hain — app band ho, phone lock ho, phir bhi waqt par alarm/notification aayega (jaisa native alarm clock app karta hai).
2. **Customize App Editor** — Settings → "🎨 Custom Screen" → "Kholein". Yahan se:
   - Naya element add karein: Button, Text, Card, Toggle, Emoji, ya Image (+ button dabayein)
   - Element ko ungli/mouse se **kahin bhi drag** kar k rakh dein
   - Tap kar k select karein → neeche panel khulega jahan se: text/emoji/image, size (Small/Medium/Large), rang, effect (✨Glow / 💓Pulse / 🌟Shimmer / 🔲Border), rotation (tirha karna), aur **action** set kar sakte hain (kisi section pe le jaye, habit tick kare, note khole, ya test alarm bajaye)
   - Poori app ka **background** bhi badal sakte hain (color ya apni image)
   - **"Apply"** dabane se changes save hote hain (bagair kisi purani data — habits/notes/timetable — ko chhue). **"Cancel"** dabane se changes discard ho jate hain.
   - Ye customization **sari 5 screens par** dikhti hai (ek hi global canvas hai, jaisa aapne kaha).

## Is Project Ko APK Mein Convert Karna (Free Trika — GitHub Actions)

Mere sandbox mein Android SDK download karne ki internet access nahi hai, is liye maine **poora buildable project** taiyar kar diya hai + ek automatic build workflow (`.github/workflows/build-apk.yml`) jo GitHub par **free mein** asal .apk bana dega.

### Steps:
1. **GitHub par free account** banayein (agar nahi hai).
2. Naya **private ya public repository** banayein (e.g. `replace-deeds`).
3. Is poore folder (`replace-deeds-native`) ko us repository mein upload karein:
   - GitHub website se "Add file → Upload files" se seedha upload kar sakte hain (`node_modules` folder ko upload NA karein — usay `.gitignore` mein exclude kar diya hai, aur GitHub Actions khud `npm install` chala kar bana lega).
4. Upload ke baad, repo ke **"Actions"** tab par jayein.
5. "Build Android APK" workflow khud chalega (ya "Run workflow" button se manually chala sakte hain).
6. 3-5 minute mein build mukammal ho jayegi. Uske "Artifacts" section se **`replace-deeds-debug-apk`** download kar lein — ye ek `.zip` hogi jisme `app-debug.apk` hoga.
7. Ye `.apk` phone par transfer karein, "Install unknown apps" permission dein, aur install kar lein.

> Ye tarika 100% free hai — GitHub Actions har mahine free minutes deta hai jo is chhoti app ke liye kaafi zyada hain. Koi cost nahi, koi signing certificate ki zaroorat nahi (debug build seedha install ho jati hai).

### Alternative: Apne Computer Par Build Karna
Agar aapke paas **Android Studio** installed hai:
```
npm install
npx cap sync android
npx cap open android
```
Android Studio khulne ke baad "Run" ya "Build → Build APK" dabayein.

## Files Ka Structure
```
replace-deeds-native/
├── www/                     ← App ka HTML/CSS/JS (source of truth)
│   ├── index.html
│   ├── app.js
│   ├── manifest.json, sw.js, icons
├── android/                  ← Real native Android project (Capacitor generated)
├── capacitor.config.ts       ← App ID: com.replacedeeds.app
├── package.json
└── .github/workflows/build-apk.yml   ← Free automatic APK builder
```

Agar app ki web files (`www/index.html` ya `www/app.js`) mein future mein koi change karni ho, to change karne ke baad `npx cap sync android` chalayein taake native project update ho jaye, phir GitHub par push karein — naya APK khud ban jayega.

## Limitations (Honest)
- **Home-screen Widgets**: Abhi shamil nahi hain. Ye ek alag native Kotlin `AppWidgetProvider` likhna padta hai jo is Capacitor project ke andar add kiya ja sakta hai — agla step ho sakta hai agar chahiye.
- Native alarms ka code maine documented Capacitor Local Notifications API ke mutabiq likha hai, lekin main isay yahan compile/test nahi kar saka (sandbox mein Android SDK access nahi). Pehli build ke baad "Test Alarm" button zaroor use karein taake confirm ho sake sab sahi kaam kar raha hai — agar koi masla aaye to bata dein, thik kar dunga.
