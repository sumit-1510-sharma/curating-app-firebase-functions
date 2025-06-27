import { Routes, Route } from "react-router-dom";
import "./App.css";
import Chatroom from "./Chatroom";
import Homepage from "./Homepage";
import Bubbles from "./Bubbles";
import Bubble from "./Bubble";
import Funcs from "./Funcs";
import PhoneAuth from "./PhoneAuth";
import PresenceTester from "./PresenceTester";
import Status from "./Status";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/bubble/:bubbleId" element={<Bubble />} />
      <Route path="/bubbles" element={<Bubbles />} />
      <Route path="/funcs" element={<Funcs />} />
      <Route path="/presence" element={<PresenceTester />} />
      <Route path="/status" element={<Status />} />
      <Route path="/authenticate" element={<PhoneAuth />} />
    </Routes>
  );
}

export default App;
