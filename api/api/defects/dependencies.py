"""Defect dependencies for FastAPI dependency injection."""
from typing import Annotated

from fastapi import Depends

from api.database import get_db_pool, DatabasePool
from api.repository.defect import DefectRepository
from api.service.defect import DefectService


def get_defect_repository() -> DefectRepository:
    """Get defect repository instance."""
    return DefectRepository(get_db_pool())


def get_defect_service(
    defect_repo: DefectRepository = Depends(get_defect_repository),
) -> DefectService:
    """Get defect service instance."""
    return DefectService(defect_repo)


# Type aliases for dependency injection
DefectRepositoryDep = Annotated[DefectRepository, Depends(get_defect_repository)]
DefectServiceDep = Annotated[DefectService, Depends(get_defect_service)]
