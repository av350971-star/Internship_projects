"""
Tool 2: calculator
Safely evaluates arithmetic expressions using Python AST.
Strictly rejects eval(), imports, function calls, attribute access, and arbitrary code.
"""
import ast
import operator
from typing import Any, Dict, Union

# Allowed operators mapping
OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


def _eval_ast_node(node: ast.AST) -> Union[int, float]:
    """Recursively evaluates only safe mathematical AST nodes."""
    if isinstance(node, ast.Expression):
        return _eval_ast_node(node.body)

    # Constant numbers in Python 3.8+
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)) and not isinstance(node.value, bool):
            return node.value
        raise ValueError(f"Disallowed constant type: {type(node.value).__name__}")

    # Unary operations (e.g., -5 or +3)
    if isinstance(node, ast.UnaryOp):
        op_type = type(node.op)
        if op_type in OPERATORS:
            operand = _eval_ast_node(node.operand)
            return OPERATORS[op_type](operand)
        raise ValueError(f"Disallowed unary operator: {op_type.__name__}")

    # Binary operations (e.g., 2 + 3)
    if isinstance(node, ast.BinOp):
        op_type = type(node.op)
        if op_type in OPERATORS:
            left = _eval_ast_node(node.left)
            right = _eval_ast_node(node.right)
            if op_type is ast.Div and right == 0:
                raise ZeroDivisionError("Division by zero is not permitted.")
            # Guard against enormous exponentiation DOS
            if op_type is ast.Pow and (abs(left) > 10000 or right > 100):
                raise ValueError("Exponentiation values exceed safety limits.")
            return OPERATORS[op_type](left, right)
        raise ValueError(f"Disallowed binary operator: {op_type.__name__}")

    # Disallow all other node types (Call, Attribute, Name, Import, Lambda, etc.)
    raise ValueError(f"Security restriction: AST node '{type(node).__name__}' is not permitted.")


def calculator(expression: str) -> Dict[str, Any]:
    """
    Safely parses and evaluates an arithmetic expression string.
    Returns structured result with the evaluated numerical value.
    """
    cleaned_expr = expression.strip()
    if not cleaned_expr:
        raise ValueError("Expression cannot be empty.")

    # Guard against suspicious tokens before even parsing
    disallowed_keywords = ["import", "exec", "eval", "__", "lambda", "os", "sys", "open", "read", "write"]
    for kw in disallowed_keywords:
        if kw in cleaned_expr.lower():
            raise ValueError(f"Security violation: Keyword '{kw}' is strictly forbidden.")

    try:
        parsed_tree = ast.parse(cleaned_expr, mode="eval")
        result = _eval_ast_node(parsed_tree)
        # Format clean integer representation if float has no decimal remainder
        if isinstance(result, float) and result.is_integer():
            formatted_result = int(result)
        else:
            formatted_result = round(result, 6)

        return {
            "expression": cleaned_expr,
            "result": formatted_result,
            "status": "success"
        }
    except ZeroDivisionError as zde:
        raise ValueError(f"Math error: {str(zde)}")
    except (SyntaxError, ValueError) as ve:
        raise ValueError(f"Invalid arithmetic expression: {str(ve)}")
    except Exception as e:
        raise ValueError(f"Evaluation error: {str(e)}")
