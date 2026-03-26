import type { Edge, Node } from "@xyflow/react";
import type { ChapterDoc, ChapterEdge } from "./TrailData";
import type { ChapterNodeData } from "./NodeTypes";

const collapsedSize = {
    width: 224,
    height: 290,
}

const defaultExpandedSize = {
    width: 420,
    height: 280,
}

const collisionPadding = 32

export class TrailGraphBuilder {
    chapters: ChapterDoc[]
    chapterEdges: ChapterEdge[]
    chapterMap: Map<string, ChapterDoc>

    constructor(chapters:ChapterDoc[], chapterEdges:ChapterEdge[]){
        this.chapters = chapters
        this.chapterEdges = chapterEdges
        this.chapterMap = new Map(chapters.map((chapter) => [chapter.id, chapter]))
    }


    getEdges(){
        const edges: Edge[] = []

        for(const [source, target] of this.chapterEdges){
            edges.push({
                id: `${source}-${target}`,
                source,
                target,
            })
        }

        return edges
    }

    getGraph(){
        const nodes: Node<ChapterNodeData>[] = []

        for(const chapter of this.chapters){
            nodes.push({
                id: chapter.id,
                type: "chapter",
                position: {
                    x: chapter.column * 280,
                    y: chapter.row * 220,
                },
                data: {
                    title: chapter.title,
                    color: chapter.color,
                    expanded: false,
                },
            })
        }

        return {nodes, edges: this.getEdges()}
    }

    getNodeSize(node:Node<ChapterNodeData>){
        const chapter = this.chapterMap.get(node.id)
        return node.data.expanded ? chapter.expandedSize ?? defaultExpandedSize : collapsedSize
    }    

    getNodeRect(node:Node<ChapterNodeData>){
        const size = this.getNodeSize(node)

        return {
            left: node.position.x,
            top: node.position.y,
            right: node.position.x + size.width,
            bottom: node.position.y + size.height,
            centerX: node.position.x + size.width / 2,
            centerY: node.position.y + size.height / 2,
        }
    }

    static getCollisionShift(
        anchorRect:{ left: number; top: number; right: number; bottom: number; centerX: number; centerY: number },
        movingRect:{ left: number; top: number; right: number; bottom: number; centerX: number; centerY: number },
    ){
        const overlapX = Math.min(anchorRect.right, movingRect.right) - Math.max(anchorRect.left, movingRect.left)
        const overlapY = Math.min(anchorRect.bottom, movingRect.bottom) - Math.max(anchorRect.top, movingRect.top)

        if(overlapX <= 0 || overlapY <= 0){
            return null
        }

        if(overlapX < overlapY){
            return {
                x: movingRect.centerX >= anchorRect.centerX ? overlapX + collisionPadding : -(overlapX + collisionPadding),
                y: 0,
            }
        }

        return {
            x: 0,
            y: movingRect.centerY >= anchorRect.centerY ? overlapY + collisionPadding : -(overlapY + collisionPadding),
        }
    }

    getExpandedGraph(currentNodes:Node<ChapterNodeData>[], clickedNodeId:string){
        const nodes = currentNodes.map((node) => ({
            ...node,
            position: { ...node.position },
            data: { ...node.data },
            style: node.style ? { ...node.style } : undefined,
        }))
        const maxZIndex = Math.max(...nodes.map((node) => node.zIndex ?? 0), 0)

        const clickedNode = nodes.find((node) => node.id === clickedNodeId)!
        const isExpanded = clickedNode.data.expanded

        clickedNode.data.expanded = !isExpanded
        clickedNode.style = isExpanded ? undefined : this.getNodeSize(clickedNode) ?? defaultExpandedSize
        clickedNode.zIndex = isExpanded ? 0 : maxZIndex + 1

        const queue = [clickedNode]

        while(queue.length > 0){
            const anchorNode = queue.shift()!
           
            for(const movingNode of nodes){
                if(movingNode.id === anchorNode.id) continue

                const anchorRect = this.getNodeRect(anchorNode)
                const movingRect = this.getNodeRect(movingNode)

                if(!anchorRect || !movingRect) continue

                const shift = TrailGraphBuilder.getCollisionShift(anchorRect, movingRect)

                if(!shift) continue

                movingNode.position = {
                    x: movingNode.position.x + shift.x,
                    y: movingNode.position.y + shift.y,
                }

                queue.push(movingNode)
            }
        }

        return {nodes, edges: this.getEdges()}
    }
}
