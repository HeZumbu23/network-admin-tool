import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { api } from "../api/client";

type SwitchNode = Node<{ label: React.ReactNode }>;
type SwitchEdge = Edge;

export function TopologyPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<SwitchNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<SwitchEdge>([]);
  const [loading, setLoading] = useState(true);

  const loadTopology = useCallback(async () => {
    setLoading(true);
    const data = await api.topology.get();

    const flowNodes: SwitchNode[] = data.switches.map((sw: any) => ({
      id: String(sw.id),
      position: { x: sw.posX || Math.random() * 500, y: sw.posY || Math.random() * 400 },
      data: {
        label: (
          <div className="text-center">
            <div className="font-semibold text-sm">{sw.name}</div>
            <div className="text-xs text-gray-500">{sw.portCount} Ports</div>
            {sw.ipAddress && <div className="text-xs text-gray-400">{sw.ipAddress}</div>}
          </div>
        ),
      },
      style: {
        background: sw.isManaged ? "#dbeafe" : "#f3f4f6",
        border: sw.isManaged ? "2px solid #3b82f6" : "1px solid #d1d5db",
        borderRadius: "12px",
        padding: "8px 16px",
      },
    }));

    const flowEdges: SwitchEdge[] = data.connections.map((c: any) => ({
      id: `conn-${c.id}`,
      source: String(c.fromSwitchId),
      target: String(c.toSwitchId),
      label: c.linkType,
      style: { stroke: c.linkType === "trunk" ? "#3b82f6" : "#9ca3af" },
      animated: c.linkType === "trunk",
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
    setLoading(false);
  }, [setNodes, setEdges]);

  useEffect(() => {
    loadTopology();
  }, [loadTopology]);

  // Save positions on drag end
  const handleNodesChange = (changes: NodeChange<SwitchNode>[]) => {
    onNodesChange(changes);

    const positionChanges = changes.filter(
      (c) => c.type === "position" && "dragging" in c && !c.dragging && "position" in c
    );
    if (positionChanges.length > 0) {
      const positions = positionChanges.map((c: any) => ({
        id: Number(c.id),
        posX: c.position.x,
        posY: c.position.y,
      }));
      api.topology.savePositions(positions);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Netzwerk-Topologie</h1>
        <p className="text-gray-500">Laden...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Netzwerk-Topologie</h1>
      {nodes.length === 0 ? (
        <p className="text-gray-500">
          Noch keine Switches vorhanden. Erstelle Switches und Verbindungen, um die Topologie zu sehen.
        </p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" style={{ height: "70vh" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      )}
    </div>
  );
}
