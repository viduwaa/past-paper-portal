import Link from "next/link";
import { Github, BarChart3, FileText } from "lucide-react";

export function Footer() {
    return (
        <footer className="mt-16 border-t bg-muted/30">
            <div className="mx-auto px-4 py-6 sm:px-6 md:w-[90%] sm:w-4/5">
                <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>FOT Past Papers Portal</span>
                        <span className="hidden opacity-40 sm:inline">·</span>
                        <span className="hidden sm:inline">
                            Created by{" "}
                            <a
                                href="https://github.com/viduwaa"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-foreground transition-colors"
                            >
                                viduwa
                            </a>
                        </span>
                    </div>

                    <nav className="flex items-center gap-1 sm:gap-2">
                        <Link
                            href="/stats"
                            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <BarChart3 className="h-3.5 w-3.5" />
                            Live Stats
                        </Link>
                        <a
                            href="https://github.com/viduwaa/past-paper-portal"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <Github className="h-3.5 w-3.5" />
                            Repository
                        </a>
                    </nav>
                </div>
            </div>
        </footer>
    );
}
