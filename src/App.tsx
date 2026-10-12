import { useState, useEffect, useCallback } from "react";
import { fetchClasses, type ClassRow } from "./db";
import { Hub } from "./components/Hub";
import { Setup } from "./components/Setup";
import { Planner } from "./components/Planner";
import { Tools } from "./components/Tools";
import { GroupMaker } from "./components/GroupMaker";
import "./App.css";

export type Page = "tools" | "hub" | "setup" | "planner" | "groupmaker";

function App() {
  const [page, setPage] = useState<Page>("tools");
  const [classId, setClassId] = useState<string | null>(null);
  const [classData, setClassData] = useState<ClassRow | null>(null);
  const [allClasses, setAllClasses] = useState<ClassRow[]>([]);

  const refreshClasses = useCallback(async () => {
    try {
      const data = await fetchClasses();
      setAllClasses(data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { refreshClasses(); }, [refreshClasses]);

  const navigate = (p: Page, cid?: string) => {
    if (cid) {
      setClassId(cid);
      const found = allClasses.find((item) => item.id === cid);
      setClassData(found || null);
      if (!found) {
        fetchClasses().then((classes) => {
          setAllClasses(classes);
          setClassData(classes.find((item) => item.id === cid) || null);
        }).catch(console.error);
      }
    }
    setPage(p);
  };

  const handleClassUpdated = (cls: ClassRow) => {
    setClassData(cls);
    setAllClasses((prev) => prev.map((c) => c.id === cls.id ? cls : c));
  };

  // Keep classData fresh when navigating
  useEffect(() => {
    if (classId) {
      const found = allClasses.find((c) => c.id === classId);
      if (found && (!classData || classData.id !== found.id || classData.name !== found.name || classData.layout !== found.layout)) {
        setClassData(found);
      }
    }
  }, [classId, allClasses, classData]);

  if (page === "tools") return <Tools onNavigate={navigate} />;
  if (page === "hub") return <Hub onNavigate={navigate} />;
  if (page === "setup" && classId) return <Setup classId={classId} classData={classData} onNavigate={navigate} onClassUpdated={handleClassUpdated} />;
  if (page === "planner" && classId) return <Planner classId={classId} classData={classData} onNavigate={navigate} />;
  if (page === "groupmaker") return <GroupMaker onNavigate={navigate} />;
  return <Tools onNavigate={navigate} />;
}

export default App;
