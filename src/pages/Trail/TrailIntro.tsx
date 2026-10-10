import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { domains } from "./TrailData";
import { chapterColors } from "./TrailTheme";
import { setIntroHidden } from "./trailStorage";

const TrailIntro = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
    // Ticked each time it opens, so the intro shows once unless the visitor asks to keep seeing it
    const [dontShowAgain, setDontShowAgain] = useState(true);
    useEffect(() => {
        if (open) setDontShowAgain(true);
    }, [open]);

    const handleOpenChange = (next: boolean) => {
        if (!next) setIntroHidden(dontShowAgain);
        onOpenChange(next);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border-border bg-card/95 backdrop-blur-md sm:rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl">The Trail</DialogTitle>
                    <DialogDescription className="text-base leading-relaxed text-white/70">
                        A map of what I've been learning, and of the notes I'm writing along the way.
                    </DialogDescription>
                </DialogHeader>

                <dl className="space-y-4 text-sm leading-relaxed">
                    <div>
                        <dt className="font-semibold text-white">Chapters and topics</dt>
                        <dd className="text-white/65">
                            Each panel is a chapter, a self-contained area like Basic ML or Linear Algebra. The smaller cards inside are its topics.
                        </dd>
                    </div>
                    <div>
                        <dt className="font-semibold text-white">Arrows</dt>
                        <dd className="text-white/65">An arrow means "this comes first". Only strict prerequisites are drawn.</dd>
                    </div>
                    <div>
                        <dt className="font-semibold text-white">Colours</dt>
                        <dd className="text-white/65">
                            The faint territories group chapters by field:
                            <span className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                                {domains.map((domain) => (
                                    <span key={domain.color} className="flex items-center gap-2">
                                        <span className={`h-2 w-2 rounded-full ${chapterColors[domain.color].dot}`} />
                                        {domain.label}
                                    </span>
                                ))}
                            </span>
                        </dd>
                    </div>
                    <div>
                        <dt className="font-semibold text-white">Make it yours</dt>
                        <dd className="text-white/65">
                            Drag a chapter by its header, fold it away with −, or click its title to zoom in. Your arrangement is remembered on
                            this device, and Reset layout puts everything back.
                        </dd>
                    </div>
                </dl>

                <p className="text-xs text-white/45">Notes are being added chapter by chapter, so many are still empty.</p>

                <DialogFooter className="flex-row items-center justify-between gap-4 sm:justify-between">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-white/65">
                        <Checkbox checked={dontShowAgain} onCheckedChange={(checked) => setDontShowAgain(checked === true)} />
                        Don't show this again
                    </label>
                    <button
                        type="button"
                        onClick={() => handleOpenChange(false)}
                        className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
                    >
                        Start exploring
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default TrailIntro;
