import { Line } from "solid-chartjs";
import { getSeasonData } from "~/lib/seasons";
import { Chart, Tooltip } from 'chart.js'
import { createEffect, createSignal, onMount } from 'solid-js'

export default function ChartComponent() {
  const [canvasRef, setCanvasRef] = createSignal()

  onMount(() => {
    Chart.register(Tooltip)
  })

  return (
    <div class="w-screen h-1/3 flex justify-center">
      <div class="relative top-4 w-5/6 h-full rounded-md shadow-gray-500 dark:shadow-none dark:bg-[#888] shadow-md p-3 overflow-x-scroll ">
        <div class="flex w-[300vw] md:w-full h-full">
          <Line
            ref={setCanvasRef}
            width={812}
            height={512}
            fallback={fallback}
            options={{
              title: {
                display: false,
              },
              layout: {
                padding: 0,
              },
              pointStyle: customPointCanvas({ pointRadius: 10, borderColor: "#693800", backgroundColor: "rgb(105 56 0 / 70%)" }),
              scales: {
                x: {
                  display: false,
                },
                y: {
                  display: false,
                },
              },
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                tooltip: {
                  displayColors: false,
                  padding: 15,
                }
              },

            }}
            data={getSeasonData()}
          />
        </div>
      </div>
    </div>
  )
}

const fallback = () => <p>الرسم غير متاح حالياً</p>

const customPointCanvas = function (options: { pointRadius: number, backgroundColor: string, borderColor: string }) {
  const cvs = document.createElement('canvas') as HTMLCanvasElement,
    ctx = cvs.getContext('2d'),
    radius = options.pointRadius || 5;
  cvs.height = 2 * radius;
  cvs.width = 2 * radius;
  //star from https://stackoverflow.com/a/58043598/16466946
  const nSpikes = 5, x0 = cvs.width / 2, y0 = cvs.height / 2;
  ctx?.beginPath();
  for (let i = 0; i < nSpikes * 2; i++) {
    const rotation = Math.PI / 2,
      angle = (i / (nSpikes * 2)) * Math.PI * 2 + rotation,
      dist = radius / 2 * (i % 2) + radius / 2,
      x = x0 + Math.cos(angle) * dist,
      y = y0 + Math.sin(angle) * dist;
    if (i === 0) {
      ctx?.moveTo(x, y);
    }
    else {
      ctx?.lineTo(x, y);
    }
  }
  ctx?.closePath();
  ctx!.fillStyle = options.backgroundColor;
  ctx!.strokeStyle = options.borderColor;
  ctx?.fill();
  ctx?.stroke();
  return cvs;
}
