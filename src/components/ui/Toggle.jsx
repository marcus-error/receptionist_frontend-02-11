import { useState } from "react";

export default function Toggle({ defaultOn = true, onChange }) {
  const [on, setOn] = useState(defaultOn);

  const handleClick = () => {
    const next = !on;
    setOn(next);
    if (onChange) onChange(next);
  };

  return (
    <div
      className={"toggle" + (on ? "" : " off")}
      role="switch"
      aria-checked={on}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    />
  );
}
