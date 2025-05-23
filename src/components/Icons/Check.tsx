export default function Check() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="26px"
      height="26px"
      viewBox="0 0 24 24"
    >
      <mask id="lineMdCheckAll0">
        <g
          fill="none"
          stroke="#fff"
          stroke-dasharray="24"
          stroke-dashoffset="24"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
        >
          <path d="M2 13.5l4 4l10.75 -10.75">
            <animate
              fill="freeze"
              attributeName="stroke-dashoffset"
              dur="0.4s"
              values="24;0"
            />
          </path>
          <path stroke="#000" stroke-width="6" d="M7.5 13.5l4 4l10.75 -10.75">
            <animate
              fill="freeze"
              attributeName="stroke-dashoffset"
              begin="0.4s"
              dur="0.4s"
              values="24;0"
            />
          </path>
          <path d="M7.5 13.5l4 4l10.75 -10.75">
            <animate
              fill="freeze"
              attributeName="stroke-dashoffset"
              begin="0.4s"
              dur="0.4s"
              values="24;0"
            />
          </path>
        </g>
      </mask>
      <rect
        width="24"
        height="24"
        fill="currentColor"
        mask="url(#lineMdCheckAll0)"
      />
    </svg>
  );
}
