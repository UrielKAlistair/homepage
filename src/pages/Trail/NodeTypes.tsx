import { Handle, Position } from "@xyflow/react";
import type { Node, NodeProps, NodeTypes } from "@xyflow/react";


export type ChapterNodeData = {
    title: string;
    color: string;
    expanded: boolean;
};

const chapterColorClasses: Record<string, string> = {
    orange: "border-orange-200 bg-orange-400 shadow-[0_0_60px_rgba(251,146,60,0.18)]",
    red: "border-red-200 bg-red-400 shadow-[0_0_60px_rgba(248,113,113,0.18)]",
    blue: "border-blue-200 bg-blue-400 shadow-[0_0_60px_rgba(96,165,250,0.18)]",
};

const ChapterNode = ({ data }: NodeProps<Node<ChapterNodeData>>) => {
    if(data.expanded){
        return (
            <div className="relative h-full w-full rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-sm">    
                <Handle type="target" position={Position.Left} className="invisible"/>
                
                <div className="flex w-28 h-full shrink-0 items-start justify-center rounded-l-[2rem] bg-background/40 px-4 py-6">
                        <p className="break-words text-center text-2xl font-semibold text-white">
                        {data.title}
                        </p>
                </div>
                <div className="flex-1" />
                
                <Handle type="source" position={Position.Right} className="invisible"/>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center">
            <div className="relative">
                <Handle type="target" position={Position.Left} className="invisible"/>
                <div className={`h-16 w-16 rounded-full border-2 ${chapterColorClasses[data.color]}`} />
                <Handle type="source" position={Position.Right} className="invisible"/>
            </div>
            <p className="mt-5 text-2xl font-semibold text-white">{data.title}</p>
        </div>
    );
};



export const trailNodeTypes: NodeTypes = {
    chapter: ChapterNode,
};
