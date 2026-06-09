interface NavigationIconProps {
  onClick?: () => void;
}

export function NavigationIcon({ onClick }: NavigationIconProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col justify-between w-6 h-3 text-r-text-primary"
      aria-label="Menu"
    >
      <span className="block w-full h-[1.5px] bg-current rounded-full" />
      <span className="block w-full h-[1.5px] bg-current rounded-full" />
    </button>
  );
}
