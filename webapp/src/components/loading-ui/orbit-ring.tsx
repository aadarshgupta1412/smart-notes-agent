import { cn } from "@/lib/utils";

function OrbitRing({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <>
      <style>{`
        @keyframes loading-ui-orbit-ring-rotation {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <span
        role="status"
        className={cn("relative inline-flex items-center justify-center", className)}
        {...props}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border-2 border-current opacity-25"
        />
        <span
          aria-hidden="true"
          className="absolute inset-[-8.333%] rounded-full border-2 border-transparent border-b-current"
          style={{
            animation:
              "loading-ui-orbit-ring-rotation var(--duration, 1s) linear infinite",
          }}
        />
        <span className="sr-only">Loading</span>
      </span>
    </>
  );
}

export { OrbitRing };
