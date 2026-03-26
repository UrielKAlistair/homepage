import { Background, BackgroundVariant, ReactFlow, useEdgesState, useNodesState } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import Navbar from "@/components/navbar";
import { chapterEdges, chapters } from "./TrailData";
import { trailNodeTypes } from "./NodeTypes";
import { TrailGraphBuilder} from "./TrailDatatoGraph";


const Trail = () => {
    const builder = new TrailGraphBuilder(chapters, chapterEdges)
    
    const initialGraph = builder.getGraph();
    const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges);

    const onNodeClick = (_: unknown, node: { id: string }) => {
        const graph = builder.getExpandedGraph(nodes, node.id)

        setNodes(graph.nodes)
        setEdges(graph.edges)
    };

    return (
        <div className="min-h-screen bg-[#08131b] text-white">
            <Navbar />

            <main className="h-[calc(100vh-72px)] p-4 md:p-6">
                <div className="h-full overflow-hidden rounded-3xl border border-white/10 bg-[#0b1720]">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        nodeTypes={trailNodeTypes}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onNodeClick={onNodeClick}

                        defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
                        minZoom={0.3}
                        maxZoom={4}
                        nodesDraggable={true}
                        nodesConnectable={false}
                        elementsSelectable={false}
                        proOptions={{ hideAttribution: true}}
                    >
                        <Background variant={BackgroundVariant.Lines} gap={40} size={1} color="rgba(255,255,255,0.06)"/>
                    </ReactFlow>
                </div>
            </main>
        </div>
    );
};

export default Trail;
