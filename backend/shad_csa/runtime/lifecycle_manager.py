import uuid
import time
from typing import List, Optional
from ..nodes.execution_node import ExecutionNode

class NodeIdentity:
    """
    SHAD-CSA Phase 6: Node Lineage & Identity.
    Tracks lineage depth and trust history.
    """
    def __init__(self, parent_id: Optional[str] = None, lineage_depth: int = 0):
        self.id = str(uuid.uuid4())[:8]
        self.parent = parent_id
        self.lineage_depth = lineage_depth
        self.trust_vector_history = []
        self.birth_time = time.time()

    def evolve(self, trust_score: float):
        self.trust_vector_history.append(trust_score)

class NodeLifecycleManager:
    """
    SHAD-CSA Phase 6: Economic Node Lifecycle.
    Manages spawning and retiring nodes based on ECF budget.
    """
    def __init__(self, ecf, provider_fn):
        self.ecf = ecf
        self.provider_fn = provider_fn
        self.active_nodes = []
        self.retired_count = 0
        self.MAX_NODE_CAP = 20

    def spawn_node(self, parent_identity: Optional[NodeIdentity] = None) -> Optional[ExecutionNode]:
        """Spawns a new node if budget and cap allow."""
        if len(self.active_nodes) >= self.MAX_NODE_CAP:
            return None
            
        if not self.ecf.allocate("node", cost=1.0):
            return None

        # Create Identity
        parent_id = parent_identity.id if parent_identity else None
        depth = (parent_identity.lineage_depth + 1) if parent_identity else 0
        identity = NodeIdentity(parent_id, depth)
        
        # Create Node
        node_name = f"Node_{identity.id}"
        node = ExecutionNode(node_name, self.provider_fn)
        node.identity = identity # Attach identity
        
        self.active_nodes.append(node)
        print(f"[Lifecycle] Spawned {node_name} (Lineage Depth: {depth})")
        return node

    def retire_node(self, node: ExecutionNode):
        """Retires a node and provides a partial budget refund."""
        if node in self.active_nodes:
            self.active_nodes.remove(node)
            node.fail_silently() # Disable node
            self.retired_count += 1
            self.ecf.refund("node", 0.5) # 50% refund for retirement
            print(f"[Lifecycle] Retired {node.name}. Partial refund issued.")
