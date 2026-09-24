import { useNavigate } from "@solidjs/router";
import { useUser } from "../context/user";
import "../styles/landing.css";
import Login from "./Login";
import { createEffect } from "solid-js";

export default function Landing() {
  return (
    <div dir="rtl" class="landing">
      <nav>
        <div class="wrap">
          <div class="brand">Nova</div>
        </div>
      </nav>

      <header class="hero">
        <div class="wrap hero-grid">
          <div>
            <h1 class="headline">
              محاضراتك، واختباراتك
              <br />
              في مكان <span class="accent">واحد منظّم</span>
            </h1>
            <p class="sub">
              نوفا تجمع محاضراتك بتنسيق عالي الجودة لفريقنا التطوعي، وأسئلة
              الدورات السابقة. يتتبع نقاط ضعفك — كل ذلك يعمل حتى بدون إنترنت.
            </p>
            <div class="cta-row">
              <a class="btn-primary" href="#start">
                جرّب نوفا الآن
              </a>
            </div>
          </div>
          <div class="mock">
            <div class="mock-card">
              <div class="mock-toolbar">
                <span>B</span>
                <span>I</span>
                <span>H</span>
                <span>▦</span>
                <span>🖼</span>
              </div>
              <div class="mock-h">
                {" "}
                المهارات السريرية: المحاضرة الثالثة: الاعراض والعلامات الهضمية
              </div>
              <div class="mock-line w1"></div>
              <div class="mock-line w2"></div>
              <div class="mock-line w3"></div>
              <div class="mock-p">
                {" "}
                <strong> النزف الهضمي </strong>
                هو <span class="mock-hl">اخراج دم </span> من اي مكان من الانبوب
                الهضمي ...
              </div>
            </div>
            <div class="chip-float">
              <span class="dot"></span> 16 من 20 إجابة صحيحة
            </div>
          </div>
        </div>
      </header>

      <section id="features">
        <div class="wrap">
          <div class="section-head">
            <h2>كل أدوات المذاكرة، بدون فوضى</h2>
            <p>
              خمس ميزات أساسية صُممت لطالب يحتاج يذاكر بسرعة، يراجع بذكاء، ويثق
              إن معلوماته محفوظة.
            </p>
          </div>
          <div class="feature-grid">
            <div class="feature">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M4 4h11a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4Z" />
                <path d="M17 4h1a2 2 0 0 1 2 2v14h-3" />
                <path d="M8 8h6M8 12h6" />
              </svg>
              <h3>محاضرات مرتبة بالسنة والمادة</h3>
              <p>
                اختر سنتك الدراسية ومادتك، وتظهر لك كل المحاضرات مصنّفة حسب
                الفصل الدراسي — جاهزة للقراءة أو الطباعة.
              </p>
            </div>

            <div class="feature">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m9 11 3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              <h3>اختبارات تتابع نقاط ضعفك</h3>
              <p>
                بعد كل اختبار، تُجمّع الأسئلة التي أخطأت فيها في قسم خاص لكي
                تراجعها بدل أن تعيد كل شيء من الصفر.
              </p>
            </div>
            <div class="feature">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
              </svg>
              <h3>قائمة مفضلة للمراجعة السريعة</h3>
              <p>
                ثبّت الأسئلة والملاحظات المهمة في قائمة مفضلة توصلها بضغطة واحدة
                قبل الامتحان مباشرة.
              </p>
            </div>
            <div class="feature">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M12 3v12" />
                <path d="m7 11 5 5 5-5" />
                <path d="M20 21H4" />
              </svg>
              <h3>يعمل بدون إنترنت</h3>
              <p>
                محاضراتك تُحفظ على جهازك تلقائيًا، فتقدر تذاكر في السرافيس 😏 أو
                أي مكان بلا شبكة.
              </p>
            </div>
            <div class="feature">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
              <h3>تتبّع انتظامك يوم بيوم</h3>
              <p>
                كل يوم تحل فيه سؤال واحد على الأقل يُسجَّل تلقائيًا، فتشوف سلسلة
                أيام مذاكرتك بوضوح.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="how">
        <div class="wrap">
          <div class="section-head">
            <h2>تبدأ في ثلاث خطوات</h2>
            <p>
              لا إعدادات معقدة، تفتح التطبيق وتكون جاهز للمذاكرة خلال دقيقة.
            </p>
          </div>
          <div class="steps">
            <div class="step">
              <h3>سجل دخولك </h3>
              <p>سجل دخولك بواسطة google</p>
            </div>
            <div class="step">
              <h3>اختر سنتك </h3>
              <p>حدد سنتك الدراسية وتظهر لك كل المواد المتعلقة بها مباشرة.</p>
            </div>
            <div class="step">
              <h3>ذاكر</h3>
              <p>
                اقرأ المحاضرة إما عبر موقعنا أو عبر ملفات ال pdf على قناة
                التلجرام
              </p>
            </div>
            <div class="step">
              <h3>اختبر نفسك وتابع تقدمك</h3>
              <p>حل أسئلة كل مادة، وراجع نقاط ضعفك قبل ما تنساها.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="start">
        <div class="cta-band">
          <h2>جاهز تنظّم مذاكرتك؟</h2>
          <p>ابدأ بمحاضرة واحدة، ونوفا يرتب لك الباقي . وسجل دخولك عبر </p>
          <Oauth />
        </div>
      </section>

      <footer>
        <div class="wrap">
          <div class="brand">Nova</div>
          <span>نوفا معكم عطول 💜</span>
        </div>
      </footer>
    </div>
  );
}

function Oauth() {
  const login = useUser().login;
  const user = useUser().user;
  const navigate = useNavigate();

  createEffect(() => {
    if (user()) {
      navigate("/", { replace: true });
    }
  });

  return (
    <button type="submit" on:click={() => login("google")} class="btn-primary">
      Google
      <img src="/app/google.svg" class="h-10 rounded-full bg-white" />
    </button>
  );
}
