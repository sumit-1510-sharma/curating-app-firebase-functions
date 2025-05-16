import { Routes, Route } from "react-router-dom";
import "./App.css";
import Chatroom from "./Chatroom";
import Homepage from "./Homepage";
import Bubbles from "./Bubbles";
import Bubble from "./Bubble";
import Funcs from "./Funcs";
import PhoneAuth from "./PhoneAuth";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/bubble/:bubbleId" element={<Bubble />} />
      <Route path="/bubbles" element={<Bubbles />} />
      <Route path="/Funcs" element={<Funcs />} />
      <Route path="/authenticate" element={<PhoneAuth />} />
    </Routes>
  );
}

export default App;
