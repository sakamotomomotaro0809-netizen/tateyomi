"""Python function executor."""

from typing import Dict, Any, Callable

from ..utils import get_logger

logger = get_logger(__name__)


def execute_python(
    func: Callable,
    args: tuple = (),
    kwargs: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Execute Python function.

    Args:
        func: Python function
        args: Positional arguments
        kwargs: Keyword arguments

    Returns:
        Execution result dict
    """
    if kwargs is None:
        kwargs = {}

    logger.info(f"Executing Python function: {func.__name__}")

    try:
        result = func(*args, **kwargs)

        output = {
            "function": func.__name__,
            "result": result,
            "success": True
        }

        logger.info("Function execution succeeded")
        return output

    except Exception as e:
        logger.error(f"Function execution error: {e}")
        return {
            "function": func.__name__,
            "result": None,
            "error": str(e),
            "success": False
        }
