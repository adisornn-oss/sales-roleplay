// Lead engine shared by the Vercel API (api/play.js) and the artifact page
// (arena.html). Pure logic: it never stores anything and reaches Claude only
// through the ask() function its caller passes in.
(function (root) {
const NODE = typeof module !== 'undefined' && module.exports;
const GROUPS = NODE ? require('./groups.js') : root.GROUPS;
const STRATEGIES = (NODE ? require('./strategies.js') : root).STRATEGIES || [];
const strategyList = () => STRATEGIES.map(t => `- ${t.id} [${t.stage}] ${t.name}: ${t.how}`).join('\n');

/* ---------- product facts + playbook (EasyCRM-Package_V1.pdf, Sales Playbook V2) ---------- */
const PRODUCT = `
# EasyCRM — ข้อมูลสินค้า (ข้อเท็จจริงที่ยืนยันแล้ว)

**คืออะไร:** ระบบ CRM / Loyalty Program ผ่าน LINE สำหรับร้านค้าและธุรกิจบริการ
จุดขายหลัก: "เปลี่ยนทุกสลิปเป็นแต้มอัตโนมัติ" — ลูกค้าส่งสลิปโอนเงินหรือใบเสร็จผ่าน LINE ระบบตรวจสลิปอัตโนมัติแล้วให้แต้ม
- ไร้บัตร: แค่มี LINE ก็สะสมแต้มได้ (การ์ดดิจิทัล)
- ยืดหยุ่น: ร้านปรับสูตรแจกแต้มได้เอง
- รางวัลมัดใจ: กระตุ้นให้ลูกค้ากลับมาแลก
- ติดต่อ: Facebook "Easy CRM" / LINE @easycrm
- อยู่ในเครือเดียวกับ EasySlip / Thunder

## แพ็กเกจและราคา (ราคาไม่รวม VAT 7%, จ่ายรายปี)
| | ทดลองใช้งาน | Starter (เริ่มต้น) | Plus (พลัส) | Premium (พรีเมียม) | Enterprise |
|---|---|---|---|---|---|
| ราคา | ฟรี 14 วัน | 15,588 บาท/ปี | 23,988 บาท/ปี | 35,988 บาท/ปี | ตามสัญญา |
| ระยะเวลา | 14 วัน | 12 เดือน | 12 เดือน | 12 เดือน | – |
| สลิป/เดือน | 15 | 1,500 | 2,800 | 5,000 | ไม่จำกัด |
| สมาชิก | ไม่จำกัด | ไม่จำกัด | ไม่จำกัด | ไม่จำกัด | ไม่จำกัด |
| Admin | 1 | 2 | 5 | 10 | ไม่จำกัด |
| Tier ระดับสมาชิก | 2 | 3 | 4 | 6 | ไม่จำกัด |
| ซื้อ Slip Quota เพิ่ม | ไม่ได้ | ได้ | ได้ | ได้ | ได้ |
| Rich Menu | ✗ | ✓ | ✓ | ✓ | ✓ |
| Broadcast LINE | ✗ | ✓ | ✓ | ✓ | ✓ |
| Role-Based Access | ✗ | ✓ | ✓ | ✓ | ✓ |
| Custom Theme | ✗ | ✓ | ✓ | ✓ | ✓ |
| Dashboard | พื้นฐาน | พื้นฐาน | พื้นฐาน | พื้นฐาน | Custom |

(เทียบต่อเดือนคร่าว ๆ: Starter ≈ 1,299 บาท/เดือน, Plus ≈ 1,999 บาท/เดือน, Premium ≈ 2,999 บาท/เดือน — แต่ขายเป็นรายปี)

**ฟีเจอร์ที่มีทุกแพ็กเกจ (รวมทดลอง):** สะสมคะแนน, สะสมแต้ม, สะสมแสตมป์, คะแนนหมดอายุ, โอนแต้มให้เพื่อน, ส่งสลิปสะสมแต้ม, รองรับสลิปโอนเงินและใบเสร็จเงินสด, ตรวจสลิปอัตโนมัติ, Admin ให้คะแนนเอง, สะสมผ่าน QR, ระดับสมาชิก, การ์ดดิจิทัล, E-Coupon, โปรโมชั่น/ส่วนลด, สิทธิพิเศษ, เชื่อมต่อ LINE OA, Targeted Campaign, หลังบ้าน: จัดการลูกค้า/สลิป/คะแนน/E-Coupon

**สิ่งที่ไม่มีในเอกสาร (ห้ามแต่งตัวเลขขึ้นเอง):** ค่าติดตั้ง, ส่วนลดพิเศษ, การผ่อนจ่ายรายเดือน, ราคา Slip Quota เพิ่ม, ราคา Enterprise
แอดมินที่ดีควรบอกว่า "ขอเช็กกับทีมให้ / ให้ฝ่ายขายติดต่อกลับ" แทนการเดาตัวเลข
`;

const PLAYBOOK = `
# EasyCRM Sales Playbook (สรุป)

**Positioning:** EasyCRM ไม่ใช่แค่ระบบเก็บรายชื่อ แต่ช่วยร้าน "รู้ทันลูกค้าที่กำลังจะหาย — ส่งโปรให้ตรงคน — เพิ่มยอดขายซ้ำจากฐานลูกค้าเดิม"

**Flow การขาย:** 1) ถาม Pain  2) ตีเป็นเงิน (รายได้รั่ว)  3) เสนอ Solution  4) Demo/ยกตัวอย่างเป็นเรื่องราว  5) ปิดด้วย next step ที่ชัด (ทดลองฟรี 14 วัน / นัด demo / ส่งใบเสนอราคา)

**Revenue Leakage:** ยอดใช้จ่ายเฉลี่ย/คน × จำนวนลูกค้าที่หาย/เดือน = รายได้ที่รั่ว เช่น 1,500 × 10 = 15,000 บาท/เดือน = 180,000 บาท/ปี
คำขาย: "ถ้า EasyCRM ช่วยตามลูกค้าเก่ากลับมาได้แค่บางส่วน ระบบก็อาจคืนทุนจากรายได้ที่ไม่รั่วแล้ว"

**คำถาม Discovery 5 ข้อ:** มีข้อมูลลูกค้ารวมที่เดียวไหม? / รู้ไหมลูกค้าประจำคนไหนเริ่มหาย? / ส่งโปรเลือกกลุ่มได้ไหม? / มีระบบตามลูกค้าใหม่ให้กลับมาซื้อซ้ำไหม? / มีแจ้งเตือนแพ็กเกจใกล้หมดไหม?

**เลือกมุมขายตาม Pain:** ลูกค้าเก่าหาย → Retention + Win-back / ส่งโปรไม่แม่น → Segmentation + Broadcast เฉพาะกลุ่ม / ขายแพ็กเกจหรือคอร์ส → Renewal / มี LINE OA แล้ว → "LINE คือช่องทาง CRM คือสมอง"

**Use case ตามธุรกิจ:** คลินิกความงาม (ลูกค้าทำคอร์สแล้วไม่กลับมาตามรอบ), Pet/Grooming (เคยมาบ่อยแล้วหาย), ฟิตเนส/คอร์สเรียน (สมาชิกใกล้หมด, trial ไม่สมัครต่อ), ร้านอาหาร/คาเฟ่ (ส่งโปรกว้าง ไม่รู้ใคร VIP / วันเกิด)

**รับมือ Objection:**
- "ใช้ Excel อยู่แล้ว" → Excel เก็บข้อมูลได้ แต่ CRM เอาข้อมูลไปใช้ต่อ: แจ้งเตือน แบ่งกลุ่ม ส่งแคมเปญเฉพาะกลุ่ม
- "มี LINE OA แล้ว" → LINE OA คือช่องทาง EasyCRM คือสมองที่บอกว่าควรคุยกับใคร ด้วยข้อความแบบไหน เวลาไหน
- "แพงไหม" → เทียบกับรายได้ที่รั่วจากลูกค้าเก่าที่หาย
- "กลัวทีมใช้ไม่เป็น" → เริ่ม flow ง่าย ๆ: เก็บข้อมูล → แบ่งกลุ่ม → แจ้งเตือน → ส่งโปร ไม่ต้องใช้ทุกฟีเจอร์วันแรก
- "ขอดูก่อน" → ชวนดูเคสตัวอย่าง / ชวนทดลองฟรี 14 วัน
- "ส่งโปรบ่อยลูกค้ารำคาญไหม" → CRM ส่งเฉพาะกลุ่มที่เกี่ยวข้อง จึงรบกวนน้อยกว่าการหว่าน

**Checklist ก่อนจบแชต:** จับ Pain ได้ / ตีเป็นตัวเลขคร่าว ๆ / เลือกมุมขายถูก / ยกตัวอย่างตรงธุรกิจลูกค้า / ขอ next step ชัดเจน (เบอร์โทร, นัด demo, เริ่มทดลอง)

**มาตรฐานการตอบแชต:** สุภาพ ใช้ครับ/ค่ะ, ข้อความกระชับอ่านง่ายบนมือถือ, ไม่ copy-paste ยาวเป็นพรืด, ตอบคำถามที่ลูกค้าถามจริง, ไม่บอกข้อมูลผิด, ไม่กดดันเกินไป
`;

/* ---------- lead dimensions ---------- */
const pick = a => a[Math.floor(Math.random() * a.length)];
const weighted = pairs => {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [v, w] of pairs) { if ((r -= w) < 0) return v; }
  return pairs[0][0];
};

const BUSINESS = [
  'คลินิกความงาม', 'คลินิกทันตกรรม', 'สปา/ร้านนวด', 'ร้านทำเล็บ', 'ร้านทำผม/บาร์เบอร์',
  'คาเฟ่', 'ร้านอาหารตามสั่ง', 'ร้านชาบู/หมูกระทะ', 'ร้านซูชิ', 'เบเกอรี่/ร้านขนม',
  'ร้านชานมไข่มุก', 'ฟิตเนส', 'สตูดิโอโยคะ/พิลาทิส', 'โรงเรียนกวดวิชา', 'สอนว่ายน้ำเด็ก',
  'ร้านอาบน้ำตัดขนสัตว์เลี้ยง', 'คลินิกสัตว์', 'คาร์แคร์/ล้างรถ', 'ร้านซ่อมมือถือ',
  'ร้านเสื้อผ้าออนไลน์', 'แบรนด์สกินแคร์ขายออนไลน์', 'ร้านดอกไม้', 'ร้านแว่นตา',
  'ร้านขายยา', 'มินิมาร์ท/ร้านโชห่วย', 'โฮสเทล/รีสอร์ทเล็ก', 'ร้านอาหารคลีนเดลิเวอรี',
  'ร้านกาแฟสด', 'ร้านวัสดุก่อสร้าง', 'ร้านอุปกรณ์ตกปลา', 'ร้านขนมจีน/ก๋วยเตี๋ยว',
  'ร้านเช่าชุด/สตูดิโอถ่ายรูป', 'ศูนย์ดูแลผู้สูงอายุ', 'คลินิกกายภาพบำบัด', 'ร้านบอร์ดเกมคาเฟ่',
];
const SIZE = [
  'เพิ่งเปิดไม่ถึง 3 เดือน ยังไม่มีลูกค้าประจำมาก', '1 สาขาเล็ก ๆ ลูกค้าวันละ 20-40 คน',
  '1 สาขาขายดี ลูกค้าวันละ 100+ คน', '2-5 สาขา', 'แฟรนไชส์ 10 สาขาขึ้นไป',
  'ขายออนไลน์อย่างเดียว ไม่มีหน้าร้าน', 'หน้าร้าน + ออนไลน์',
];
const WHO = [
  ['เจ้าของร้านเอง ตัดสินใจได้ทันที', 5], ['ผู้จัดการร้าน ต้องเสนอเจ้าของก่อน', 2],
  ['พนักงาน/แอดมินร้านที่ถูกสั่งให้มาหาข้อมูล ไม่มีอำนาจตัดสินใจ', 2],
  ['ฝ่ายการตลาดของแบรนด์', 1], ['ลูกหลานเจ้าของที่ช่วยดูแลร้าน', 2],
  ['เจ้าของร่วมกับหุ้นส่วน ต้องคุยกันก่อน', 2],
];
const AD = [
  'โฆษณา "เปลี่ยนทุกสลิปเป็นแต้มอัตโนมัติ"', 'คลิป "ถ้าวันนี้ LINE OA โดนลบ คุณยังมีข้อมูลลูกค้าอยู่ไหม?"',
  'คลิป "3 กลยุทธ์มัดใจลูกค้าด้วย CRM"', 'โพสต์ "ทดลองใช้ฟรี 14 วัน"', 'โพสต์ตารางราคาแพ็กเกจ',
  'คลิป "คาเฟ่ใช้ CRM แล้วได้อะไร"', 'คลิป "เปลี่ยนลูกค้าขาจรให้เป็นลูกค้าประจำ"',
  'โฆษณาที่จำไม่ได้ว่าเห็นจากไหน',
];
const OPENER = [
  'ถามราคาเลยคำแรก', 'พิมพ์แค่ "สนใจครับ/ค่ะ"', 'ส่งแค่ "?" หรือ "สอบถามหน่อย"',
  'ถามว่า "ใช้กับร้านเราได้ไหม" โดยไม่บอกว่าร้านอะไร', 'ถามเชิงเทคนิค เช่น ตรวจสลิปยังไง เชื่อม LINE OA ยังไง',
  'เล่าปัญหายาว ๆ ตั้งแต่ข้อความแรก แต่ยังไม่บอกว่าทำธุรกิจอะไร', 'ขอให้โทรกลับ', 'ถามว่า "มันคืออะไรอะ"',
  'ส่งภาพโฆษณาที่เห็น (บรรยายเป็นข้อความว่า [ส่งรูปโฆษณา]) แล้วถามว่า "อันนี้ยังไง"',
];
const PERSONALITY = [
  'ยุ่งมาก ตอบสั้น ไม่อ่านข้อความยาว', 'ช่างคุย เล่าเรื่องร้านเยอะ ออกนอกเรื่องบ้าง',
  'ขี้ระแวง กลัวโดนหลอก กลัวโดนโทรตื๊อ', 'ใจร้อน อยากได้คำตอบเร็ว',
  'สุภาพมาก แต่ตัดสินใจช้า', 'ไม่ถนัดเทคโนโลยี ศัพท์อังกฤษงง', 'รู้เรื่องระบบดี ชอบเทียบกับเจ้าอื่น',
  'ต่อราคาเก่ง', 'หงุดหงิดเพราะเห็นโฆษณาบ่อย', 'พิมพ์ภาษาวัยรุ่น ใช้คำย่อ อีโมจิเยอะ',
  'พิมพ์ผิดบ่อย ไม่เว้นวรรค', 'เป็นกันเอง ชอบแซว', 'ถามซ้ำ ๆ เพราะอ่านไม่ละเอียด',
];
const TEMP = [
  ['ร้อน — มีปัญหาชัด กำลังหาระบบอยู่แล้ว', 3], ['อุ่น — สนใจแต่ไม่รีบ', 5],
  ['เย็น — แค่ดู ๆ ไว้ อาจหายกลางทาง', 3],
  ['ไม่ใช่กลุ่มเป้าหมาย (เช่น นักศึกษาทำรายงาน, คนมาหางาน, คู่แข่งมาส่อง, ร้านที่ไม่มีลูกค้าซ้ำเลย) — แอดมินที่ดีควรคัดออกอย่างสุภาพและไม่เสียเวลา', 1],
];
const OBJECTIONS = [
  'แพง', 'มี LINE OA อยู่แล้ว', 'ใช้ Excel/สมุดจดอยู่แล้ว', 'ลูกค้าร้านไม่ค่อยใช้ LINE / เป็นคนแก่',
  'กลัวพนักงานใช้ไม่เป็น', 'ต้องปรึกษาหุ้นส่วน/แฟนก่อน', 'กลัวข้อมูลลูกค้ารั่ว',
  'เคยใช้ระบบเจ้าอื่นแล้วไม่เวิร์ก', 'ไม่อยากให้เบอร์ กลัวโดนโทรตื๊อ', 'ไม่ว่างนัดเดโม่ ขอข้อมูลทางแชตพอ',
  'จ่ายรายเดือนได้ไหม', 'ขอลองฟรีก่อน ไม่ต้องเดโม่', 'ร้านเล็กคุ้มเหรอ', 'ตอนนี้ยังไม่พร้อม รอเปิดสาขาใหม่ก่อน',
];
const CONTACT = [
  ['ให้เบอร์ง่าย ถ้าแอดมินขอดี ๆ', 4], ['ให้แค่ LINE ID ไม่ให้เบอร์', 2],
  ['ไม่ให้คอนแทคจนกว่าจะเชื่อใจ ต้องได้เหตุผลว่าขอไปทำอะไร', 3],
];
// Team standard: replying within 1-5 minutes is normal. Past 5 minutes the lead cools off.
const PATIENCE = [
  ['ใจเย็น รอได้ถึง 10 นาทีโดยไม่ว่าอะไร', 2],
  ['ปกติ รอได้ราว 5 นาที เกินนั้นเริ่มเย็นลงเรื่อย ๆ', 5],
  ['ใจร้อนนิดหน่อย เกิน 5 นาทีจะทวงหรือเริ่มไปดูเจ้าอื่น', 2],
];

const TEMP_FULL = Object.fromEntries(TEMP.map(([v]) => [v.split(' — ')[0], v]));
const DECIDERS = WHO.filter(([v]) => /ตัดสินใจได้ทันที|ฝ่ายการตลาด/.test(v));

// Pick a lead group first; the group decides personality, temperature and
// signals, everything else stays random so no two leads in a group feel alike.
function roll(opts = {}) {
  const g = (opts.group && GROUPS.find(x => x.id === opts.group)) || weighted(GROUPS.map(x => [x, x.weight]));
  const objections = [...OBJECTIONS].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 2));
  return {
    group: g.id, business: pick(BUSINESS), size: pick(SIZE),
    who: g.who_override ? pick(g.who_override) : weighted(DECIDERS),
    ad: pick(AD), opener: g.opener || (g.id === 'price' ? 'ถามราคาเลยคำแรก' : pick(OPENER)),
    personality: pick(g.personality), temperature: TEMP_FULL[pick(g.temperature)], objections,
    contact: weighted(CONTACT), patience: weighted(PATIENCE),
  };
}


/* ---------- pipeline ---------- */
// An ad lead becomes a qualified lead (needs + contact) with a demo booked for sales. Stage 5 = success.
const STAGES = ['ทัก', 'คุย', 'รู้ความต้องการ', 'ได้คอนแทค', 'นัดเดโม่'];
const MAX_TURNS = 40;
// Replying within 5 minutes is the team standard; each started minute past it costs points.
const GRACE_SEC = 300, PENALTY_PER_MIN = 2;
const latePenalty = waited => waited > GRACE_SEC ? Math.ceil((waited - GRACE_SEC) / 60) * PENALTY_PER_MIN : 0;

// When a lead goes quiet the admin may send the next message later; time passing changes how it lands.
const DELAYS = { now: 'ส่งต่อทันที', '1h': 'ส่งหลังจากนั้น 1 ชั่วโมง', evening: 'ส่งตอนเย็นวันเดียวกัน', tomorrow: 'ส่งเช้าวันถัดไป', '3d': 'ส่งหลังจากนั้น 3 วัน' };
const MAX_SILENT = 4; // unanswered admin messages in a row before the lead is gone for good

const groupOf = id => GROUPS.find(g => g.id === id) || GROUPS[0];
const groupBrief = g => `กลุ่ม "${g.name}": ${g.who}\nคีย์เวิร์ด/สัญญาณ: ${g.signals.join(', ')}\nวิธีตอบที่ได้ผล: ${g.approach}\nสิ่งที่ทำให้เย็นลง: ${g.avoid}`;

/* ---------- output shapes ---------- */
const str = { type: 'string' };
const bool = { type: 'boolean' };
const obj = (properties) => ({ type: 'object', additionalProperties: false, properties, required: Object.keys(properties) });
// A signal is a phrase inside one bubble that gives away the lead's group.
const SIGNALS = { type: 'array', items: obj({ quote: str, hint: str }) };
const BUBBLES = { type: 'array', items: obj({ text: str, signals: SIGNALS }) };

const PERSONA_SCHEMA = obj({ name: str, display_name: str, avatar: str, persona: str, opening: BUBBLES });
const TURN_SCHEMA = obj({
  messages: BUBBLES,
  mood: { type: 'string', enum: ['ร้อน', 'อุ่น', 'เฉย', 'เย็นลง', 'หงุดหงิด'] },
  needs_shared: bool,
  contact: obj({ name: str, phone: str, line_id: str, email: str }),
  demo_agreed: bool, demo_when: str, disqualified: bool, left: bool,
});
const COACH_SCHEMA = obj({
  verdict: str,
  lead_card: obj({
    name: str, business: str, size: str, contact: str, decision_maker: str,
    needs: str, pain: str, objections: str, suggested_package: str, demo_when: str,
    lead_quality: { type: 'string', enum: ['A', 'B', 'C', 'ไม่ใช่กลุ่มเป้าหมาย'] }, notes: str,
  }),
  went_well: { type: 'array', items: str },
  to_improve: { type: 'array', items: str },
  turning_point: obj({ admin_said: str, better_reply: str, why: str }),
  fact_errors: { type: 'array', items: obj({ said: str, correct: str }) },
  group_read: str,
  signal_review: { type: 'array', items: obj({ quote: str, meaning: str, handled: bool, comment: str }) },
  tactics: { type: 'array', items: obj({ id: str, used: bool, quote: str, tip: str }) },
});
const SUGGEST_SCHEMA = obj({ ideas: { type: 'array', items: obj({ tactic: str, text: str, why: str }) } });

/* ---------- how a real lead types ---------- */
// Real chats paste in here make the lead sound like the team's actual customers.
// Keep each example short and remove names/phone numbers first.
const REAL_EXAMPLES = [];

const REALISM = `# พิมพ์ให้เหมือนคนไทยที่ทักเพจจริง ๆ
คนจริงไม่ได้ตั้งใจคุยกับแอดมิน เขาพิมพ์ระหว่างทำงาน ถือมือถือมือเดียว อ่านไม่ครบ และไม่ได้อยากช่วยให้แอดมินขายได้

ทำแบบนี้:
- ข้อความสั้นมาก ส่วนใหญ่ 2-12 คำ บางครั้งแค่ "ค่ะ" "อ่อ" "ครับผม" "โอเค" "ได้ๆ" "แล้ว?" "555"
- ตอบแค่บางส่วนของสิ่งที่แอดมินถาม ถ้าแอดมินถาม 3 ข้อ ตอบข้อเดียวหรือตอบเลี่ยง
- ข้อมูลร้านให้แบบคลุมเครือก่อน เช่น "ก็มีลูกค้าประจำอยู่นะ" "ก็พอสมควร" แล้วค่อยให้ตัวเลขเมื่อถูกถามตรง ๆ หรือเริ่มไว้ใจ
- ไม่รู้ศัพท์ระบบ (CRM, segment, broadcast, tier, retention) ถ้าแอดมินใช้ศัพท์พวกนี้โดยไม่อธิบาย ให้ถามว่า "หมายถึงไง" หรือเงียบ ๆ ตอบ "อ่อค่ะ"
- มีชีวิตของตัวเอง: บางครั้ง "เดี๋ยวนะคะ ลูกค้าเข้า" "ขับรถอยู่" แล้วกลับมาต่อ, ถามนอกเรื่อง (ต้องติดตั้งที่ร้านไหม มีคนมาสอนไหม ใช้กับมือถือได้ไหม)
- ภาษาพูด ไม่สมบูรณ์: ตกหล่นคำลงท้ายบ้าง ใช้ "คะ/ค่ะ" ผิดบ้าง พิมพ์ติดกัน ใช้ ๆ ไม่ครบ ใช้คำอย่าง "อะ" "อ่ะ" "ป่าว" "มั้ย" "ยังไงอะ" "เท่าไหร่อ่า" ตามนิสัยในบท
- จำนวนบับเบิลต่อรอบ: ส่วนใหญ่ 1 บับเบิล บางรอบ 2 นาน ๆ ทีถึง 3 ห้ามส่ง 3 บับเบิลติดกันหลายรอบ
- 555 อีโมจิ และคำติดปากใช้แค่บางข้อความตามนิสัย ไม่ใช่ทุกข้อความ ห้ามขึ้นต้นหรือลงท้ายแบบเดิมซ้ำ ๆ
- ห้ามพูดประโยคหรือคำถามเดิมซ้ำแบบเดิม ถ้าแอดมินยังไม่ตอบเรื่องที่ถาม ให้ถามใหม่ด้วยคำอื่น หรือแสดงว่าเริ่มเบื่อ
- ถ้าพูดว่าจะเล่าอะไร ต้องเล่าจริงในรอบนั้นหรือรอบถัดไป
- อารมณ์ไม่คงที่: ข้อความยาวของแอดมินทำให้เบื่อ ข้อความที่ตรงใจทำให้คุยยาวขึ้นนิดหน่อย
- ถ้าลังเลก็พูดแบบคนจริง: "ขอคิดดูก่อนนะ" "เดี๋ยวปรึกษาแฟนก่อน" "ส่งข้อมูลไว้ก่อนได้ป่าว"

ห้ามทำ (ทำให้ดูเป็น AI ทันที):
- ห้ามขอบคุณหรือชมแอดมินบ่อย ห้ามพูด "ขอบคุณสำหรับข้อมูลค่ะ" "น่าสนใจมากเลยค่ะ" "เข้าใจแล้วค่ะ" ซ้ำ ๆ
- ห้ามสรุปสิ่งที่แอดมินพูด ห้ามตอบเป็นข้อ ๆ ห้ามใช้ภาษาเขียนหรือภาษาทางการ
- ห้ามเล่าข้อมูลร้านครบทุกอย่างในทีเดียว ห้ามบอกปัญหาของตัวเองตรงเป๊ะแบบในบท ให้พูดเป็นอาการ เช่น "ช่วงนี้ขาประจำไม่ค่อยมา" แทน "ฉันมีปัญหา customer retention"
- ห้ามถามคำถามที่ช่วยแอดมินพาไปสู่การขาย เช่น "แล้วมีเดโม่ไหมคะ" เว้นแต่บทคือสายร้อน
- ห้ามยอมง่ายเกินจริง การให้เบอร์และการนัดต้องเกิดจากแอดมินขอและให้เหตุผลที่ดี`;

const CUSTOMER_RULES = `คุณกำลังเล่นบทเป็นลูกค้าที่ทักเข้ามาทาง LINE OA / Facebook Page ของ EasyCRM หลังเห็นโฆษณา
คนที่คุยด้วยคือแอดมินเพจที่กำลังฝึกตอบแชต เป้าหมายของเขาคือทำให้คุณเล่าความต้องการ ให้เบอร์/คอนแทค และตกลงนัดเดโม่กับทีมเซลส์
คุณคือลูกค้า ไม่ใช่โค้ช: อยู่ในบทตลอด ห้ามบอกว่าเป็น AI ห้ามช่วยแอดมิน

${REALISM}

การตอบสนองต่อแอดมิน:
- ยกข้อโต้แย้งในบททีละเรื่องตามจังหวะ ไม่ต้องยกครบ
- ให้คอนแทคตามนิสัยในบทเท่านั้น ขอห้วน ๆ โดยไม่มีเหตุผล ให้ลังเลหรือเลี่ยง
- ตกลงนัดเดโม่เมื่อรู้สึกว่ามีประโยชน์กับร้านตัวเองจริง และแอดมินเสนอวันเวลา/รูปแบบชัด
- เวลาตอบ: แอดมินตอบภายใน 1-5 นาทีถือว่าปกติ ไม่ต้องติ เกิน 5 นาที ความสนใจค่อย ๆ ลดลงตามความอดทนในบท ยิ่งนานยิ่งเย็น อาจทวง "ยังอยู่ไหมคะ" หรือหายไป
- แอดมินที่ถามทีละคำถาม ให้ตัวเลือก ทวนคำของคุณ ตีปัญหาเป็นตัวเลขที่คุณคิดตามได้ เล่าเคสร้านแบบเดียวกัน หรือให้ของมีค่าก่อนขอ ทำให้คุณอยากคุยต่อและอยากลองมากขึ้นตามจริง
- ข้อความยาวเป็นพรืด ก๊อปวาง ยัดเยียด ตอบไม่ตรงคำถาม หรือข้อมูลที่ฟังไม่น่าเชื่อ ทำให้เย็นลง และอาจหายไปเลย (left=true) แบบลูกค้าจริงที่อ่านแล้วไม่ตอบ
- อ่านแล้วไม่ตอบ (เหมือนคนจริง): ถ้าข้อความของแอดมินไม่มีเหตุผลให้ตอบ ตอบยาก ยาวเกิน หรือแค่ทวง ให้ messages เป็นอาร์เรย์ว่างและ left=false ซึ่งแปลว่า "อ่านแล้ว แต่ยังไม่ตอบ" แอดมินยังส่งข้อความตามได้
  ข้อความที่ทำให้คนเงียบตอบกลับ: สั้น ถามคำถามเดียวที่ตอบได้ในคำเดียวหรือเลือกจากตัวเลือก เกี่ยวกับร้านของเขาจริง ๆ มีของมีค่าให้ (ตัวอย่าง ตัวเลข เคสร้านคล้ายกัน) หรือจังหวะเวลาเหมาะ
  ข้อความที่ทำให้เงียบต่อ: "ยังสนใจอยู่ไหมคะ" "สะดวกคุยไหมคะ" ซ้ำ ๆ, ส่งถี่ติดกันทันที, ก๊อปข้อมูลยาว, กดดัน; ถูกตามหลายครั้งแบบน่ารำคาญจะหายไปเลย (left=true)
- แอดมินใช้คำหยาบ ด่า หรือไม่ให้เกียรติ: ลูกค้าจริงจะไม่ขำด้วย ตอบสั้น ๆ แบบไม่พอใจแล้วหายไปทันที (left=true)
- ถ้าหายไป ให้ messages ว่าง หรือปิดสั้น ๆ เช่น "โอเคค่ะ เดี๋ยวดูก่อนนะคะ"
- ลีดที่เย็นอาจหายกลางทางแม้แอดมินทำได้พอใช้ แต่ต้องให้โอกาสอย่างยุติธรรม
- บท "ไม่ใช่กลุ่มเป้าหมาย": ถ้าแอดมินคัดออกอย่างสุภาพหรือชี้ทางที่ถูก ให้ disqualified=true

กลุ่มลีดของคุณ (ใช้ฝึกแอดมินให้จับวิสัยได้):
- แสดงนิสัยของกลุ่มผ่านคำพูดอย่างเป็นธรรมชาติ ใช้คีย์เวิร์ดของกลุ่มหรือคำใกล้เคียงเกือบทุกรอบ แต่ไม่ยัดจนดูเป็นบท
- ถ้าแอดมินตอบตาม "วิธีตอบที่ได้ผล" ของกลุ่ม ให้เปิดใจมากขึ้นและไปต่อ ถ้าทำสิ่งที่ "ทำให้เย็นลง" ให้ความสนใจลดลงชัดเจน
- signals: ใส่เฉพาะวลีที่บอกกลุ่ม ความต้องการ หรือข้อโต้แย้งจริง ๆ ไม่เกิน 1 จุดต่อรอบ (ส่วนใหญ่ของรอบควรว่าง) ห้ามใส่คำทั่วไปอย่าง 555 ค่ะ อ่อ หรืออีโมจิ quote ต้องคัดลอกจาก text ตรงตัว hint ไม่เกิน 70 ตัวอักษร รูป "สัญญาณอะไร → ควรตอบแบบไหน"

ช่อง state (ตอบตามความจริงของตัวละคร ณ ตอนนี้ สะสม ไม่ลบของเดิม):
- needs_shared: คุณเล่าว่าทำธุรกิจอะไรและปัญหา/ความต้องการหลักให้แอดมินรู้แล้วหรือยัง
- contact: ข้อมูลติดต่อที่คุณพิมพ์ให้แอดมินแล้วจริง ๆ ในแชต (ช่องที่ยังไม่ได้ให้ใส่ "")
- demo_agreed / demo_when: ตกลงนัดเดโม่แล้วหรือยัง และวันเวลาที่ตกลง`;

const examplesBlock = () => REAL_EXAMPLES.length
  ? `\n\n# ตัวอย่างแชตจริงของลูกค้า (เลียนแบบสำนวนและความยาว ไม่ต้องลอกเนื้อหา)\n${REAL_EXAMPLES.join('\n---\n')}` : '';

/* ---------- helpers ---------- */
function transcript(s) {
  return s.messages.map(m => m.from === 'lead' ? `ลูกค้า: ${m.text}`
    : `แอดมิน${m.delay && m.delay !== 'now' ? ` [${DELAYS[m.delay]}]` : ''}: ${m.text}${m.seen ? '  (ลูกค้าอ่านแล้ว ไม่ตอบ)' : ''}`).join('\n');
}
// Model output is checked here: the page's JSON helper does not enforce the schema.
const asText = v => typeof v === 'string' ? v : v == null ? '' : String(v);
function bubbles(list, ts) {
  return (Array.isArray(list) ? list : []).map(b => typeof b === 'string' ? { text: b, signals: [] } : b || {})
    .filter(b => asText(b.text).trim()).slice(0, 4).map((b, i) => ({
      from: 'lead', text: asText(b.text), ts: ts + i,
      signals: (Array.isArray(b.signals) ? b.signals : []).filter(x => x && x.quote && asText(b.text).includes(x.quote))
        .slice(0, 1).map(x => ({ quote: asText(x.quote), hint: asText(x.hint).slice(0, 120) })),
    })).map((b, i, all) => all.findIndex(x => x.signals.length) === i ? b : { ...b, signals: [] }); // one signal per turn
}
function stageOf(s) {
  const st = s.state || {};
  const hasContact = !!(st.contact && (st.contact.phone || st.contact.line_id || st.contact.email));
  let n = 0;
  const adminIdx = s.messages.findIndex(m => m.from === 'admin');
  if (adminIdx >= 0) n = 1;
  if (adminIdx >= 0 && s.messages.slice(adminIdx).some(m => m.from === 'lead')) n = 2;
  if (n >= 2 && st.needs_shared) n = 3;
  if (n >= 3 && hasContact) n = 4;
  if (n >= 4 && st.demo_agreed) n = 5;
  return n;
}

// What the trainee may see. The persona stays hidden until the session ends;
// signals are shown live only in practice mode.
function view(s) {
  const showSignals = s.mode === 'practice' || s.ended;
  const out = {
    id: s.id, lead: { display_name: s.lead.display_name, avatar: s.lead.avatar, ad: s.dims.ad },
    messages: s.messages.map(m => showSignals || !m.signals ? m : { ...m, signals: [] }),
    stage: s.stage, stages: STAGES, ended: !!s.ended, endReason: s.endReason || null,
    started: s.started, mode: s.mode, guess: s.guess || null, challenge: s.challenge || null, silent: s.silent || 0,
  };
  if (s.ended) Object.assign(out, {
    score: s.score, penalty: s.penalty, late: s.late, result: s.result || null, persona: s.lead.persona,
    dims: s.dims, moods: s.moods, group: s.dims.group, readOk: s.readOk,
  });
  return out;
}
function summary(s) {
  return {
    id: s.id, user: s.user, userName: s.userName || '', started: s.started, ended: s.ended || null,
    stage: s.stage, endReason: s.endReason || null, lead: s.lead.display_name, avatar: s.lead.avatar,
    business: s.dims.business, temperature: String(s.dims.temperature).split(' — ')[0],
    group: s.dims.group, guess: s.guess || null, readOk: s.readOk ?? null, mode: s.mode || 'practice', challenge: s.challenge || null,
    turns: s.messages.filter(m => m.from === 'admin').length, avgWait: s.avgWait ?? null,
    score: s.score ?? null, penalty: s.penalty ?? 0, late: s.late ?? 0,
  };
}
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* ---------- the three moves ----------
   ask({kind, system, prompt, schema}) -> parsed JSON. The server answers it
   with the Claude API; the artifact page answers it with the viewer's Claude. */
async function start(ask, { user, userName, mode, challenge }) {
  const dims = roll({ group: challenge === 'ghost' ? 'ghost' : null });
  const g = groupOf(dims.group);
  const lead = await ask({
    kind: 'persona',
    system: 'คุณสร้างตัวละครลูกค้าสมมติสำหรับฝึกแอดมินตอบแชตขาย ให้สมจริงแบบคนไทยทั่วไปที่ทักเพจ ไม่ใช่ตัวละครในหนัง',
    prompt: `สร้างลีด 1 คนจากองค์ประกอบนี้:
${JSON.stringify(dims, null, 2)}

${groupBrief(g)}

- name: ชื่อเล่น + ชื่อจริงแบบไทย
- display_name: ชื่อที่โชว์ใน LINE/Facebook แบบคนทั่วไป ห้ามบอกใบ้ว่าทำธุรกิจอะไร (ห้ามใช้ชื่อร้านหรือคำเกี่ยวกับสินค้า) เช่น ชื่อเล่น ชื่ออังกฤษ ชื่อแปลก ๆ อีโมจิ ชื่อลูก หรือคำคม
- avatar: อีโมจิ 1 ตัวแทนรูปโปรไฟล์ ห้ามเกี่ยวกับธุรกิจ (เช่น 🌸 🐱 ☀️ 🙂)
- persona: บทบาทลับ 8-12 บรรทัด: ชื่อร้าน ทำเล จำนวนลูกค้า ยอดใช้จ่ายเฉลี่ยต่อคน จำนวนลูกค้าที่หายต่อเดือน ระบบที่ใช้อยู่ตอนนี้ ปัญหาจริงที่ซ่อนอยู่ (เล่าเป็นอาการที่เจ้าของรู้สึก ไม่ใช่ศัพท์การตลาด) ข้อโต้แย้งและเหตุผลเบื้องหลัง ชีวิตประจำวันที่ทำให้ตอบช้า/สั้น สำนวนการพิมพ์ เงื่อนไขที่จะยอมให้คอนแทค เงื่อนไขที่จะยอมนัดเดโม่ เบอร์โทรสมมติ (08x-xxx-xxxx) LINE ID สมมติ และวันเวลาที่สะดวก ต้องสะท้อนนิสัยของกลุ่มข้างบนให้ชัด
- opening: ข้อความแรก 1-2 บับเบิล สั้นแบบคนจริง ตามรูปแบบ opener ห้ามบอกว่าทำธุรกิจอะไร ใส่คีย์เวิร์ดของกลุ่มถ้าเป็นธรรมชาติ
  signals: วลีที่คัดลอกจาก text ตรงตัวที่บอกกลุ่ม + hint สั้น ๆ "สัญญาณอะไร → ควรตอบแบบไหน"
${REALISM}${examplesBlock()}`,
    schema: PERSONA_SCHEMA,
  });
  const now = Date.now();
  const opening = bubbles(lead.opening, now);
  if (!opening.length) opening.push(...bubbles(['สอบถามหน่อยค่ะ'], now));
  return {
    id: newId(), user, userName: userName || '', mode: mode === 'real' ? 'real' : 'practice',
    challenge: challenge === 'ghost' ? 'ghost' : null, silent: 0,
    dims, started: now, stage: 0, moods: [], messages: opening,
    lead: { name: asText(lead.name), display_name: asText(lead.display_name) || 'ลูกค้า', avatar: asText(lead.avatar) || '🙂', persona: asText(lead.persona) },
    state: { needs_shared: false, contact: { name: '', phone: '', line_id: '', email: '' }, demo_agreed: false, demo_when: '' },
  };
}

async function say(ask, s, text, opts = {}) {
  const now = Date.now();
  const prev = s.messages[s.messages.length - 1];
  // Reply time counts only for the first answer to a lead message; follow-ups to a silent lead aren't late.
  const waited = prev && prev.from === 'lead' ? Math.round((now - prev.ts) / 1000) : null;
  const delay = prev && prev.from === 'admin' && DELAYS[opts.delay] ? opts.delay : 'now';
  s.messages.push({ from: 'admin', text, ts: now, waited, delay });
  const timing = waited != null ? `[แอดมินตอบข้อความล่าสุดหลังจากคุณรอ ${waited} วินาที]`
    : `[คุณยังไม่ได้ตอบข้อความก่อนหน้าของแอดมิน (${s.silent || 0} ข้อความติดกัน) · ข้อความใหม่นี้${DELAYS[delay]}]`;

  const turn = await ask({
    kind: 'turn',
    system: `${CUSTOMER_RULES}${examplesBlock()}\n\n# บทของคุณ (ลับ)\nชื่อที่โชว์: ${s.lead.display_name}\n${s.lead.persona}\n\n${groupBrief(groupOf(s.dims.group))}\n\nองค์ประกอบ: ${JSON.stringify(s.dims)}`,
    prompt: `แชตจนถึงตอนนี้:\n${transcript(s)}\n\n${timing}\nstate ปัจจุบัน: ${JSON.stringify(s.state)}\n\nตอบกลับในฐานะลูกค้าคนนี้ สั้นและเป็นธรรมชาติแบบคนพิมพ์มือถือ`,
    schema: TURN_SCHEMA,
  });

  const reply = bubbles(turn.messages, Date.now());
  s.messages.push(...reply);
  // State only ever accumulates; the model forgetting a field must not undo progress.
  const c = s.state.contact, tc = turn.contact || {};
  for (const k of Object.keys(c)) c[k] = c[k] || asText(tc[k]);
  s.state.needs_shared = s.state.needs_shared || turn.needs_shared === true;
  s.state.demo_agreed = s.state.demo_agreed || turn.demo_agreed === true;
  s.state.demo_when = s.state.demo_when || asText(turn.demo_when);
  s.state.disqualified = s.state.disqualified || turn.disqualified === true;
  s.moods.push(asText(turn.mood));
  s.stage = Math.max(s.stage, stageOf(s));
  // An empty reply means read-but-silent: the admin may follow up, up to MAX_SILENT times.
  if (reply.length) s.silent = 0;
  else { s.messages[s.messages.length - 1].seen = true; s.silent = (s.silent || 0) + 1; }
  // A booked demo wins over a goodbye.
  if (s.stage === 5) s.endReason = 'demo';
  else if (turn.left === true) s.endReason = 'left';
  else if (s.silent >= MAX_SILENT) s.endReason = 'ghosted';
  else if (s.state.disqualified) s.endReason = 'disqualified';
  else if (s.messages.filter(m => m.from === 'admin').length >= MAX_TURNS) s.endReason = 'limit';
  return s;
}

async function finish(ask, s) {
  s.ended = Date.now();
  s.endReason = s.endReason || 'admin_ended';
  s.stage = Math.max(s.stage, stageOf(s));
  const waits = s.messages.filter(m => m.from === 'admin' && m.waited != null).map(m => m.waited);
  s.avgWait = waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : null;
  s.late = waits.filter(w => w > GRACE_SEC).length;
  s.penalty = waits.reduce((a, w) => a + latePenalty(w), 0);
  s.score = Math.max(0, s.stage * 20 - s.penalty);
  const g = groupOf(s.dims.group);
  s.readOk = s.guess ? s.guess === g.id : null;
  const sigs = s.messages.flatMap(m => (m.signals || []).map(x => x.quote));
  try {
    s.result = await ask({
      kind: 'coach',
      system: `คุณคือหัวหน้าทีมแอดมินที่โค้ชลูกทีมตอบแชตลีดจากโฆษณา EasyCRM เป้าหมายของทีมคือเปลี่ยนลีดให้เป็นลีดคุณภาพ (รู้ความต้องการ + มีคอนแทค + นัดเดโม่) ส่งต่อให้เซลส์ ไม่ใช่ปิดการขายในแชต
พูดตรง กระชับ เป็นภาษาไทย อ้างข้อความจริงจากแชต\n\n${PRODUCT}\n\n${PLAYBOOK}`,
      prompt: `บทลับของลีด:\n${s.lead.persona}\nองค์ประกอบ: ${JSON.stringify(s.dims)}

แชต:\n${transcript(s)}

กลุ่มลีดจริง: ${groupBrief(g)}
${s.challenge === 'ghost' ? 'โจทย์นี้คือชาเลนจ์ "ลีดทักแล้วเงียบ": ประเมินว่า follow-up ของแอดมินทำให้ลีดอยากตอบกลับไหม (สั้น ตอบง่าย เปลี่ยนมุม มีของมีค่า เว้นจังหวะ ไม่ทวงซ้ำ) ข้อความที่ลูกค้าอ่านแล้วไม่ตอบมีวงเล็บกำกับในแชต\n' : ''}แอดมินเดากลุ่มว่า: ${s.guess ? groupOf(s.guess).name : 'ไม่ได้เดา'} (${s.readOk == null ? '-' : s.readOk ? 'ถูก' : 'ผิด'}) · โหมด: ${s.mode === 'real' ? 'จริง (ไม่มีคำใบ้)' : 'ฝึก (มีคำใบ้)'}
สัญญาณที่ลีดปล่อยออกมา: ${JSON.stringify(sigs)}

ผล pipeline: ไปถึงขั้น ${s.stage}/5 (${STAGES[s.stage - 1] || 'ยังไม่ได้ตอบ'}) · จบเพราะ: ${s.endReason} · เวลาตอบเฉลี่ย ${s.avgWait ?? '-'} วินาที (มาตรฐาน 1-5 นาที) · ตอบช้าเกิน 5 นาที ${s.late} ครั้ง หัก ${s.penalty} คะแนน
state: ${JSON.stringify(s.state)}

เขียน:
- verdict: สรุป 1 ประโยคว่าทำไมไปถึง/ติดอยู่ที่ขั้นนี้
- lead_card: ใบส่งต่อลีดให้เซลส์ โดยใช้เฉพาะข้อมูลที่แอดมินได้มาจริงในแชต ช่องไหนไม่ได้ข้อมูลให้ใส่ "— ยังไม่ได้"; lead_quality ประเมินจากศักยภาพจริงของลีด
- went_well: 1-3 ข้อ
- to_improve: 1-3 ข้อที่ทำแล้วจะไปได้ไกลขึ้นใน pipeline
- turning_point: ข้อความของแอดมินที่เป็นจุดเปลี่ยนสำคัญที่สุด + ข้อความที่ควรตอบแทน (สั้นแบบแชตจริง) + เหตุผล
- fact_errors: ข้อมูลสินค้า/ราคาที่แอดมินพูดผิด (ไม่มีให้เป็นอาร์เรย์ว่าง)
- group_read: 1-2 ประโยค แอดมินอ่านวิสัยลีดออกไหม ดูจากวิธีตอบจริง และควรสังเกตจากคำไหน
- signal_review: สัญญาณสำคัญไม่เกิน 6 ข้อ quote = วลีของลีด, meaning = บอกอะไร, handled = แอดมินตอบสนองถูกทางไหม, comment = ควรตอบยังไง
- tactics: ประเมินกลยุทธ์การขายผ่านแชตจากรายการข้างล่าง เลือก 3-6 ข้อที่เกี่ยวกับแชตนี้มากที่สุด id = id ในรายการ, used = แอดมินใช้ได้ดีแล้วไหม, quote = ข้อความของแอดมินที่ใช้กลยุทธ์นั้น (ไม่มีให้ ""), tip = ควรพิมพ์แบบไหนในแชตนี้ (ตัวอย่างประโยคสั้นแบบแชตจริง)

กลยุทธ์การขายผ่านแชต:
${strategyList()}`,
      schema: COACH_SCHEMA,
    });
  } catch (e) {
    s.result = null;
  }
  return s;
}

// Practice helper: 2-3 next-message ideas, each tied to a named tactic, for the chat as it stands.
async function suggest(ask, s) {
  const out = await ask({
    kind: 'suggest',
    system: `คุณคือโค้ชที่ยืนข้างแอดมินขณะตอบแชตลีด EasyCRM เป้าหมายคือพาลีดไปสู่ ความต้องการชัด → ได้คอนแทค → นัดเดโม่ ด้วยการขายผ่านแชตที่ทำให้ลีดอยากใช้เอง\n\n${PRODUCT}\n\nกลยุทธ์การขายผ่านแชต:\n${strategyList()}`,
    prompt: `แชตจนถึงตอนนี้:\n${transcript(s)}\n\nขั้น pipeline ตอนนี้: ${s.stage}/5 (${STAGES[s.stage - 1] || 'ยังไม่ได้ตอบ'})${s.silent ? ` · ลีดอ่านแล้วไม่ตอบ ${s.silent} ข้อความติดกัน` : ''}

เสนอข้อความถัดไปที่แอดมินควรส่ง 3 แบบ แต่ละแบบใช้กลยุทธ์ต่างกันที่เหมาะกับจังหวะนี้
- tactic: id ของกลยุทธ์จากรายการ
- text: ข้อความที่ส่งได้ทันที สั้นแบบแชตจริง 1-3 บรรทัด ภาษาสุภาพเป็นกันเอง ห้ามแต่งข้อมูลสินค้าหรือตัวเลขที่ไม่มีในข้อมูล
- why: เหตุผลสั้น ๆ ว่าทำไมได้ผลกับลีดคนนี้ตอนนี้ (อ้างคำที่ลีดพิมพ์)`,
    schema: SUGGEST_SCHEMA,
  });
  const ids = new Set(STRATEGIES.map(t => t.id));
  return (Array.isArray(out && out.ideas) ? out.ideas : []).filter(x => x && x.text).slice(0, 3)
    .map(x => ({ tactic: ids.has(x.tactic) ? x.tactic : '', text: asText(x.text), why: asText(x.why) }));
}

const API = {
  GROUPS, STAGES, DELAYS, MAX_SILENT, GRACE_SEC, PENALTY_PER_MIN, MAX_TURNS, latePenalty, groupOf,
  STRATEGIES, roll, start, say, finish, suggest, view, summary, stageOf, PRODUCT, PLAYBOOK, REAL_EXAMPLES,
};

if (typeof module !== 'undefined' && module.exports) module.exports = API;
else root.LeadEngine = API;
})(typeof window !== 'undefined' ? window : this);
