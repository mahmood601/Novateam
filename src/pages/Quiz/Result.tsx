export default function Result(props: { subject: string, answers: any[] }) {
  const stats = createMemo(() => {
    const correct = props.answers.filter(a => a.answer).length;
    return {
      total: props.answers.length,
      correct,
      wrong: props.answers.length - correct
    };
  });

  return (
    <div class="h-screen flex items-center justify-center p-6 text-center">
      <div class="bg-gray-50 dark:bg-gray-800 p-8 rounded-2xl w-full max-w-md shadow-xl">
        <h2 class="text-2xl font-bold mb-6">النتيجة النهائية</h2>
        <div class="space-y-4 text-xl">
          <p>عدد الأسئلة: <span class="text-main">{stats().total}</span></p>
          <p class="text-green-600">صح: {stats().correct}</p>
          <p class="text-red-600">خطأ: {stats().wrong}</p>
        </div>
        <button
          onClick={() => location.reload()}
          class="mt-8 bg-main text-white px-8 py-3 rounded-full w-full font-bold"
        >
          إعادة الاختبار
        </button>
      </div>
    </div>
  );
}

// function Result(props: { subject: string }) {
//   // addAnswersToProgress(unwrap(userAnswers()));
//   let numberOfTrues = 0;
//   userAnswers().map((e) => {
//     if (e.answer) numberOfTrues++;
//   });
//   return (
//     <div class="bg-main-light dark:bg-main-dark dark:text-main-light absolute flex h-screen w-screen items-center justify-center">
//       <div class="bg-darker-light-1 dark:bg-lighter-dark-1 max-w-1/2 rounded-md">
//         <div class="p-2">
//           <p dir="rtl">
//             عدد الاسئلة : <span class="text-main">{userAnswers().length}</span>
//           </p>
//           <p dir="rtl">
//             عدد الاجابات الصحيحة: <span class="text-true">{numberOfTrues}</span>
//           </p>
//           <p dir="rtl">
//             عدد الاجابات الخاطئة:{" "}
//             <span class="text-warn">
//               {userAnswers().length - numberOfTrues}
//             </span>
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }