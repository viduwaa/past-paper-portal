"use client";

import { useState, useEffect } from "react";
import {
    Star,
    Loader2,
    Linkedin,
    Mail,
    MessageSquare,
    Github,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface FeedbackStats {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: { stars: number; count: number }[];
}

export function WebsiteFeedback() {
    const [userRating, setUserRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [stats, setStats] = useState<FeedbackStats | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [lastSubmitted, setLastSubmitted] = useState<Date | null>(null);

    // Feature request states
    const [featureRequest, setFeatureRequest] = useState("");
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
    const [requestError, setRequestError] = useState("");
    const [lastRequestSubmitted, setLastRequestSubmitted] =
        useState<Date | null>(null);
    const [requestSuccess, setRequestSuccess] = useState(false);

    // Generate browser fingerprint
    const generateBrowserId = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        ctx?.fillText(navigator.userAgent, 10, 10);

        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width + "x" + screen.height,
            new Date().getTimezoneOffset(),
            !!window.sessionStorage,
            !!window.localStorage,
            !!window.indexedDB,
            canvas.toDataURL(),
        ].join("|");

        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
            const char = fingerprint.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    };

    // Fetch feedback statistics
    const fetchStats = async () => {
        try {
            const response = await fetch("/api/website-feedback");
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error("Failed to fetch feedback stats:", error);
        }
    };

    // Load stats on component mount
    useEffect(() => {
        fetchStats();
    }, []);

    const handleRating = async (rating: number) => {
        // Check rate limiting (1 hour)
        if (lastSubmitted) {
            const timeDiff = Date.now() - lastSubmitted.getTime();
            const oneHour = 60 * 60 * 1000;
            if (timeDiff < oneHour) {
                const remainingMinutes = Math.ceil(
                    (oneHour - timeDiff) / (60 * 1000)
                );
                setError(
                    `Please wait ${remainingMinutes} minutes before rating again`
                );
                return;
            }
        }

        setIsSubmitting(true);
        setError("");

        try {
            const browserId = generateBrowserId();
            const response = await fetch("/api/website-feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    rating,
                    browserId,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setUserRating(rating);
                setLastSubmitted(new Date());
                await fetchStats(); // Refresh stats
            } else {
                setError(data.error || "Failed to submit rating");
            }
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFeatureRequest = async () => {
        if (!featureRequest.trim()) {
            setRequestError("Please enter your request");
            return;
        }

        // Check rate limiting (1 hour)
        if (lastRequestSubmitted) {
            const timeDiff = Date.now() - lastRequestSubmitted.getTime();
            const oneHour = 60 * 60 * 1000;
            if (timeDiff < oneHour) {
                const remainingMinutes = Math.ceil(
                    (oneHour - timeDiff) / (60 * 1000)
                );
                setRequestError(
                    `Please wait ${remainingMinutes} minutes before submitting another request`
                );
                return;
            }
        }

        setIsSubmittingRequest(true);
        setRequestError("");

        try {
            const browserId = generateBrowserId();
            const response = await fetch("/api/feature-request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    request: featureRequest,
                    browserId,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setFeatureRequest("");
                setLastRequestSubmitted(new Date());
                setRequestSuccess(true);
                setTimeout(() => setRequestSuccess(false), 3000);
            } else {
                setRequestError(data.error || "Failed to submit request");
            }
        } catch {
            setRequestError("Network error. Please try again.");
        } finally {
            setIsSubmittingRequest(false);
        }
    };

    return (
        <div className="mt-6 space-y-6">
            {/* Contact Links */}
            <div className="flex justify-center items-center gap-4 p-4 bg-muted/50 rounded-lg border">
                <a
                    href="https://github.com/viduwaa/past-paper-portal"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-md hover:bg-muted"
                    aria-label="GitHub Repository"
                >
                    <Github className="h-5 w-5" />
                    <span className="hidden sm:inline">View Repository</span>
                </a>

                <a
                    href="https://www.linkedin.com/in/viduladeneth/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-md hover:bg-muted"
                    aria-label="LinkedIn Profile"
                >
                    <Linkedin className="h-5 w-5" />
                    <span className="hidden sm:inline">LinkedIn</span>
                </a>

                <a
                    href="mailto:viduladenethsalwathura@gmail.com"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-md hover:bg-muted"
                    aria-label="Email"
                >
                    <Mail className="h-5 w-5" />
                    <span className="hidden sm:inline">Email</span>
                </a>
            </div>

            {/* Website Rating */}
            <div className="grid grid-cols-1 md:grid-cols-2 justify-center content-center gap-4">
                <div className="p-4 bg-background rounded-lg border w-full max-w-md mx-auto">
                    <h4 className="text-md font-semibold mb-3 flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        Rate This Website
                    </h4>
                    {/* Average Rating Display */}
                    {stats && (
                        <div className="mb-4 p-3 bg-muted/50 rounded-md">
                            <div className="flex items-center gap-2 mb-1 justify-center">
                                <div className="flex">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={`h-4 w-4 ${
                                                star <=
                                                Math.round(stats.averageRating)
                                                    ? "fill-yellow-400 text-yellow-400"
                                                    : "text-gray-300"
                                            }`}
                                        />
                                    ))}
                                </div>
                                <span className="text-sm font-medium">
                                    {stats.averageRating.toFixed(1)}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                                Based on {stats.totalReviews} review
                                {stats.totalReviews !== 1 ? "s" : ""}
                            </p>
                        </div>
                    )}
                    {/* Rating Stars */}
                    <div className="mb-3">
                        <label className="text-sm font-medium mb-2 block">
                            Your Rating
                        </label>
                        <div className="flex gap-1 justify-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => handleRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    disabled={isSubmitting}
                                    className="focus:outline-none disabled:opacity-50"
                                >
                                    <motion.div
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <Star
                                            className={`h-8 w-8 transition-colors ${
                                                star <= (hoverRating || userRating)
                                                    ? "fill-yellow-400 text-yellow-400"
                                                    : "text-gray-300 hover:text-yellow-300"
                                            }`}
                                        />
                                    </motion.div>
                                </button>
                            ))}
                        </div>
                        {userRating > 0 && (
                            <p className="text-xs text-muted-foreground mt-1 text-center">
                                You rated this website {userRating} star
                                {userRating !== 1 ? "s" : ""}
                            </p>
                        )}
                    </div>
                    {/* Loading State */}
                    {isSubmitting && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Submitting your rating...
                        </div>
                    )}
                    {/* Error Message */}
                    {error && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-sm text-red-500 mt-2 text-center"
                        >
                            {error}
                        </motion.p>
                    )}
                </div>
                {/* Feature Request Section */}
                <div className="p-4 bg-background rounded-lg border w-full max-w-md mx-auto">
                    <h4 className="text-md font-semibold mb-3 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Feature Request / Paper Request
                    </h4>
                    <div className="space-y-3">
                        <Textarea
                            placeholder="Request new features, suggest improvements, or request specific past papers..."
                            value={featureRequest}
                            onChange={(e) => setFeatureRequest(e.target.value)}
                            className="min-h-20 resize-none"
                            maxLength={500}
                            disabled={isSubmittingRequest}
                        />
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                                {featureRequest.length}/500
                            </span>
                            <Button
                                onClick={handleFeatureRequest}
                                disabled={
                                    isSubmittingRequest || !featureRequest.trim()
                                }
                                size="sm"
                            >
                                {isSubmittingRequest ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Submitting...
                                    </>
                                ) : (
                                    "Submit Request"
                                )}
                            </Button>
                        </div>
                        {/* Request Success */}
                        {requestSuccess && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-sm text-green-600 text-center"
                            >
                                ✅ Request submitted successfully!
                            </motion.p>
                        )}
                        {/* Request Error */}
                        {requestError && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-sm text-red-500 text-center"
                            >
                                {requestError}
                            </motion.p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
