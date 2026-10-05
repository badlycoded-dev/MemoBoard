import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../services/api";
export default function Dashboard() {
  const nav = useNavigate();
  const boards = useQuery(api.boards.list);
  const create = useMutation(api.boards.create);
  return (
    <div className="page">
      <h1>Your boards</h1>
      <button className="btn" onClick={async () => nav(`/board/${await create({ name: `Board ${(boards?.length ?? 0) + 1}` })}`)}>New whiteboard</button>
      <div style={{ marginTop: 20 }}>
        {boards?.length === 0 && <p>No boards yet. Create one to start drawing.</p>}
        {boards?.map((b) => (
          <Link key={b._id} className="row" to={`/board/${b.publicId}`}><b>{b.name}</b><br /><small>{new Date(b.createdAt).toLocaleDateString()}</small></Link>
        ))}
      </div>
    </div>
  );
}
