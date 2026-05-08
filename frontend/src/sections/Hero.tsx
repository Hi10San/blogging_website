import { DottedSurface } from "../components/Dotted-surface";
import { cn } from "../lib/utils";
import TextPressure from "../components/ui/TextPressure";

export default function DemoOne() {
	return (
		<DottedSurface className="size-full">
			<div className="absolute inset-0 flex items-center justify-center">
				<div
					aria-hidden="true"
					className={cn(
						'pointer-events-none absolute -top-10 left-1/2 size-full -translate-x-1/2 rounded-full',
						'bg-[radial-gradient(ellipse_at_center,--theme(--color-foreground/.1),transparent_50%)]',
						'blur-[30px]',
					)}
				/>
				<div className="w-[40vw] max-w-[400px] flex items-center justify-center -mt-[10vh]">
					<TextPressure
						text="BLOG."
						flex={true}
						alpha={false}
						stroke={false}
						width={true}
						weight={true}
						italic={true}
						textColor="var(--foreground)"
						strokeColor="#ff0000"
						minFontSize={36}
					/>
				</div>
			</div>
		</DottedSurface>
	);
}
