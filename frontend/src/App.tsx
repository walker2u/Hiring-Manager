import React, { useState, useEffect } from "react";

// Import shadcn/ui components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Separator } from "./components/ui/separator";
import { ScrollArea } from "./components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import { Badge } from "./components/ui/badge";
import { Building2, BellRing, UserCheck, LogIn, Github } from "lucide-react";

// --- Demo Data ---
interface Candidate {
  id: string;
  name: string;
  title: string;
  avatarUrl?: string;
  resumeDetails: string;
  tags: string[];
}

function App() {
  // --- State Variables ---
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [watchStatus, setWatchStatus] = useState<string>("Initializing...");
  const [expiryInfo, setExpiryInfo] = useState<string>("N/A");
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setIsLoading(true);

    const fetchAuthStaus = async () => {
      try {
        const res = await fetch("http://localhost:3000");
        const data = await res.json();
        if (data.authenticated) {
          setAuthenticated(true);
          setHistoryId(data.historyId);
          setWatchStatus(data.watchStatus);
          setExpiryInfo(data.expiryInfo);
        }
        return data;
      } catch (error) {
        console.error("Error fetching auth status:", error);
      }
    };
    const fetchCandidates = async () => {
      try {
        const res = await fetch("http://localhost:3000/getCandidates");
        const data = await res.json();
        setCandidates(data.qualifiedCandidates);
      } catch (error) {
        console.error("Error fetching candidates:", error);
      }
    };
    fetchAuthStaus();
    fetchCandidates();
    setIsLoading(false);
  }, [authenticated]);

  const authenticateUser = () => {
    //redirect user
    window.location.href = "http://localhost:3000/auth";
  };

  // --- Event Handlers ---
  const handleSelectCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
  };

  const handleDeselectCandidate = () => {
    setSelectedCandidate(null);
  };

  const handleLogout = async () => {
    try {
      const res = await fetch("http://localhost:3000/logout");
      console.log(await res.json());
      if (res.ok) {
        setAuthenticated(false);
        setSelectedCandidate(null);
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const getInitials = (name: string): string => {
    const names = name.split(" ");
    if (names.length === 0) return "?";
    if (names.length === 1) return names[0][0].toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const renderResumeDetails = (details: string) => {
    const html = details
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold
      .replace(/\n/g, "<br />"); // Newlines
    return { __html: html };
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 dark:from-neutral-900 dark:via-black dark:to-neutral-800">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/80 dark:bg-black/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-red-600" />
            <h1 className="text-xl font-bold text-red-700 dark:text-red-500">
              Redberry
            </h1>
            <span className="text-sm text-muted-foreground">
              Hiring Manager
            </span>
          </div>
          <div>
            {authenticated && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleLogout();
                }}
              >
                Log Out
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4 flex-1">
        <div className="flex flex-col md:flex-row gap-6 h-full">
          {authenticated && (
            <aside className="w-full md:w-1/3 lg:w-1/4 border rounded-lg bg-white dark:bg-neutral-900 shadow-sm">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-green-600" />
                  Qualified Candidates
                </h2>
                <p className="text-sm text-muted-foreground">
                  Click to view details
                </p>
              </div>
              <ScrollArea className="h-[calc(100vh-180px)] md:h-auto md:max-h-[calc(100vh-200px)]">
                {" "}
                <div className="p-2 space-y-1">
                  {candidates.length > 0 ? (
                    candidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted dark:hover:bg-neutral-800 ${
                          selectedCandidate?.id === candidate.id
                            ? "bg-muted dark:bg-neutral-800 ring-2 ring-red-500"
                            : ""
                        }`}
                        onClick={() => handleSelectCandidate(candidate)}
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage
                            src={candidate.avatarUrl}
                            alt={candidate.name}
                          />
                          <AvatarFallback>
                            {getInitials(candidate.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium leading-none">
                            {candidate.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {candidate.title}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="p-4 text-sm text-center text-muted-foreground">
                      No candidates found.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </aside>
          )}

          <main
            className={`flex-1 ${
              authenticated ? "md:w-2/3 lg:w-3/4" : "w-full"
            }`}
          >
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-muted-foreground">Loading status...</p>
              </div>
            ) : !authenticated ? (
              <Card className="w-full max-w-lg mx-auto mt-10 shadow-lg dark:bg-neutral-900">
                <CardHeader className="text-center">
                  <LogIn className="h-12 w-12 mx-auto text-red-600 mb-3" />
                  <CardTitle>Authentication Required</CardTitle>
                  <CardDescription>
                    Please authenticate with Google to enable notifications and
                    view candidates.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button
                    className="bg-red-600 hover:bg-red-700 dark:text-white"
                    onClick={() => authenticateUser()}
                  >
                    Authenticate with Google (Demo)
                  </Button>
                  <Separator className="my-4" />
                  <p className="text-xs text-muted-foreground mt-4">
                    Webhook Endpoint:{" "}
                    <code className="bg-muted px-1 rounded">/webhook</code>{" "}
                    (POST)
                  </p>
                </CardContent>
              </Card>
            ) : selectedCandidate ? (
              <Card className="w-full shadow-lg dark:bg-neutral-900">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage
                          src={selectedCandidate.avatarUrl}
                          alt={selectedCandidate.name}
                        />
                        <AvatarFallback>
                          {getInitials(selectedCandidate.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-2xl">
                          {selectedCandidate.name}
                        </CardTitle>
                        <CardDescription className="text-base">
                          {selectedCandidate.title}
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeselectCandidate}
                    >
                      Close
                    </Button>
                  </div>
                  {/* <div className="flex flex-wrap gap-2 mt-2">
                    {selectedCandidate.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div> */}
                </CardHeader>
                <Separator />
                <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
                  <div
                    dangerouslySetInnerHTML={renderResumeDetails(
                      selectedCandidate.resumeDetails
                    )}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="w-full shadow-lg dark:bg-neutral-900">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BellRing className="h-5 w-5 text-blue-600" />
                    Gmail Notifier Status
                  </CardTitle>
                  <CardDescription>
                    Overview of the notification service connection.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Separator />
                  <p className="flex justify-between items-center pt-3">
                    <span className="font-medium text-muted-foreground">
                      Authentication:
                    </span>
                    <Badge
                      variant={authenticated ? "default" : "destructive"}
                      className={authenticated ? "bg-green-600 text-white" : ""}
                    >
                      {authenticated ? "Authenticated" : "Not Authenticated"}
                    </Badge>
                  </p>
                  <Separator />
                  <p className="flex justify-between items-center pt-3">
                    <span className="font-medium text-muted-foreground">
                      Watch Status:
                    </span>
                    <Badge
                      variant={watchStatus === "Active" ? "default" : "outline"}
                      className={
                        watchStatus === "Active" ? "bg-blue-600 text-white" : ""
                      }
                    >
                      {watchStatus}
                    </Badge>
                  </p>
                  <Separator />
                  <p>
                    <span className="font-medium text-muted-foreground">
                      Watch Expires:
                    </span>{" "}
                    {expiryInfo}
                  </p>
                  <Separator />
                  <p>
                    <span className="font-medium text-muted-foreground">
                      Last History ID:
                    </span>{" "}
                    {historyId ?? (
                      <span className="text-muted-foreground italic">N/A</span>
                    )}
                  </p>
                  <Separator />
                  <p className="text-xs text-muted-foreground pt-2">
                    Webhook Endpoint:{" "}
                    <code className="bg-muted dark:bg-neutral-800 px-1 rounded">
                      /webhook
                    </code>{" "}
                    (POST)
                  </p>
                  <p className="text-sm text-center text-green-700 dark:text-green-400 pt-3">
                    (App is authenticated. Ready for notifications)
                  </p>
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>

      <footer className="text-center p-4 text-xs text-muted-foreground border-t">
        © {new Date().getFullYear()} Redberry. All rights reserved. |{" "}
        <a
          href="https://github.com/walker2u"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-red-600"
        >
          <Github className="h-3 w-3" /> Source Code
        </a>
      </footer>
    </div>
  );
}

export default App;
