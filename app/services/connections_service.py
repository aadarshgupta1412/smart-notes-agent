"""Smart Connections — automatically link similar sources.

After a source is embedded, find the top-N most similar existing sources
and store bidirectional connections in source_connections table.
"""

import logging
from app.db import get_supabase_client

logger = logging.getLogger(__name__)

MAX_CONNECTIONS = 5
SIMILARITY_THRESHOLD = 0.6


async def compute_connections(
    user_id: str,
    source_id: str,
    embedding: list[float],
    dimensions: int = 1536,
) -> list[dict]:
    """Find similar sources and store connections.

    Args:
        user_id: Owner
        source_id: The source that was just embedded
        embedding: The embedding vector
        dimensions: 1536 or 768

    Returns:
        List of connections created
    """
    supabase = get_supabase_client()
    connections = []

    try:
        if dimensions <= 768:
            result = supabase.rpc(
                "find_similar_sources_768",
                {
                    "p_embedding": embedding,
                    "p_user_id": user_id,
                    "p_exclude_source_id": source_id,
                    "p_limit": MAX_CONNECTIONS,
                    "p_threshold": SIMILARITY_THRESHOLD,
                },
            ).execute()
        else:
            result = supabase.rpc(
                "find_similar_sources",
                {
                    "p_embedding": embedding,
                    "p_user_id": user_id,
                    "p_exclude_source_id": source_id,
                    "p_limit": MAX_CONNECTIONS,
                    "p_threshold": SIMILARITY_THRESHOLD,
                },
            ).execute()

        if not result.data:
            logger.info(f"No similar sources found for {source_id}")
            return []

        rows = []
        for match in result.data:
            connected_id = match["source_id"]
            similarity = match["similarity"]

            rows.append(
                {
                    "user_id": user_id,
                    "source_id": source_id,
                    "connected_source_id": connected_id,
                    "similarity": similarity,
                }
            )
            rows.append(
                {
                    "user_id": user_id,
                    "source_id": connected_id,
                    "connected_source_id": source_id,
                    "similarity": similarity,
                }
            )

            connections.append(
                {
                    "connected_source_id": connected_id,
                    "similarity": similarity,
                }
            )

        if rows:
            supabase.table("source_connections").upsert(
                rows,
                on_conflict="source_id,connected_source_id",
            ).execute()

        logger.info(f"Created {len(connections)} connections for source {source_id}")

    except Exception as e:
        logger.error(f"Failed to compute connections for {source_id}: {e}")

    return connections
