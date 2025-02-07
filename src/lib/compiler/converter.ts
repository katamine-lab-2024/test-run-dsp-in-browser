import { NEW_NODE_TYPE, NODE_TYPE } from "./constant";
import { sortStmt } from "./sortStmt";
import type * as ast from "./types/ast";
import type * as newAst from "./types/newAst";
import type { Visitor } from "./types/newAst";
import type { Type, NewType, StructType } from "./types/type";

class ASTConverter {
  private params: newAst.VarNode[] = [];

  private convertType(type: Type): NewType {
    switch (type.type) {
      case "integer":
        return { type: "number", token: type.token };
      case "real":
        return { type: "number", token: type.token };
      case "bool":
        return { type: "boolean", token: type.token };
      case "atom":
        return { type: "string", token: type.token };
      case "list": {
        const innerType = (type as StructType).member.map((t) =>
          this.convertType(t)
        );
        return {
          type: "array",
          member: innerType,
          token: type.token,
        };
      }
      case "vector": {
        const innerType = (type as StructType).member.map((t) =>
          this.convertType(t)
        );
        return {
          type: "object",
          member: innerType,
          token: type.token,
        };
      }
      default:
        return { type: "dummy", token: type.token };
    }
  }

  private visitNode(node: ast.Node, visitor: Visitor): newAst.Node {
    if (!visitor[node.type as keyof Visitor]) {
      throw new Error(
        `Unknown node type: ${
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          (node as any).type
        }`
      );
    }
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    return visitor[node.type as keyof Visitor](node as any);
  }

  public convert(input: ast.Node): newAst.Program {
    const visitor: Visitor = {
      [NODE_TYPE.NUM]: (node: ast.LiteralNode) => ({
        type: NODE_TYPE.NUM,
        token: node.token,
      }),

      [NODE_TYPE.BOOL]: (node: ast.LiteralNode) => ({
        type: NEW_NODE_TYPE.BOOLEAN,
        token: node.token,
      }),

      [NODE_TYPE.VAR]: (node: ast.VarNode) => {
        const isInParam = this.params.some((p) => p.name === node.name);
        return {
          type: NODE_TYPE.VAR,
          token: node.token,
          isInParam,
          isInput: node.isInput,
          name: node.name,
          valueType: this.convertType(node.valueType),
        };
      },

      [NODE_TYPE.MEMBER]: (node: ast.Member) => {
        const value = this.visitNode(
          node.value as ast.VarNode,
          visitor
        ) as newAst.VarNode;
        return {
          type: NODE_TYPE.VAR,
          token: node.token,
          isInParam: value.isInParam,
          isInput: value.isInput,
          name: value.name,
          valueType: value.valueType,
        };
      },

      [NODE_TYPE.VECTOR]: (node: ast.StructNode) => {
        const member: newAst.Member[] = node.member.map((m) => {
          const v = this.visitNode(m, visitor) as newAst.VarNode | newAst.Expr;
          return {
            type: NEW_NODE_TYPE.MEMBER,
            token: m.token,
            value: v,
            isDestructuring: m.isDestructuring,
          };
        });
        return {
          type: NEW_NODE_TYPE.OBJECT,
          token: node.token,
          member: member,
          isDestructuring: node.isDestructuring,
        };
      },

      [NODE_TYPE.LIST]: (node: ast.ListNode) => {
        const member = node.member.map(
          (m) => this.visitNode(m, visitor) as newAst.Expr
        );
        return { type: NEW_NODE_TYPE.LIST, token: node.token, member };
      },

      [NODE_TYPE.CALL_EXPR]: (node: ast.Expr) => {
        if ("callee" in node) {
          const lhs = this.visitNode(node.lhs, visitor) as newAst.Expr;
          if ("rhs" in node) {
            const rhs = this.visitNode(node.rhs, visitor) as newAst.Expr;
            return {
              type: NODE_TYPE.CALL_EXPR,
              token: node.token,
              callee: node.callee,
              lhs: lhs,
              rhs: rhs,
            };
          }
          return {
            type: NODE_TYPE.CALL_EXPR,
            token: node.token,
            callee: node.callee,
            lhs: lhs,
          };
        }
        return this.visitNode(node, visitor) as newAst.Primary;
      },

      [NODE_TYPE.LENGTH]: (node: ast.LengthNode) => {
        const expr = this.visitNode(node.list, visitor) as newAst.Primary;
        return { type: NODE_TYPE.LENGTH, token: node.token, list: expr };
      },

      [NODE_TYPE.NTH]: (node: ast.NthNode) => {
        const list = this.visitNode(node.list, visitor) as newAst.Primary;
        const index = this.visitNode(node.index, visitor) as newAst.Primary;
        return { type: NODE_TYPE.NTH, token: node.token, list, index };
      },

      [NODE_TYPE.LIST_SUM]: (node: ast.ListSumNode) => {
        const list = this.visitNode(node.list, visitor) as newAst.Primary;
        return { type: NODE_TYPE.LIST_SUM, token: node.token, list };
      },

      [NODE_TYPE.SQRT]: (node: ast.SqrtNode) => {
        const expr = this.visitNode(node.expr, visitor) as newAst.Expr;
        return { type: NODE_TYPE.SQRT, token: node.token, expr };
      },

      [NODE_TYPE.EXP]: (node: ast.ExpNode) => {
        const expr = this.visitNode(node.expr, visitor) as newAst.Expr;
        return { type: NODE_TYPE.EXP, token: node.token, expr };
      },

      [NODE_TYPE.FOR]: (node: ast.ForNode) => {
        const from = this.visitNode(node.from, visitor) as newAst.Expr;
        const to = this.visitNode(node.to, visitor) as newAst.Expr;
        const inc = this.visitNode(node.inc, visitor) as newAst.Expr;
        return { type: NODE_TYPE.FOR, token: node.token, from, to, inc };
      },

      [NODE_TYPE.SELECT]: (node: ast.SelectNode) => {
        const list = this.visitNode(node.list, visitor) as newAst.Primary;
        return { type: NODE_TYPE.SELECT, token: node.token, list };
      },

      [NODE_TYPE.ASSIGN]: (node: ast.AssignNode) => {
        const lhs = this.visitNode(node.lhs, visitor) as newAst.VarNode;
        const rhs = this.visitNode(node.rhs, visitor);
        // return
        if (
          rhs.type === NEW_NODE_TYPE.FOR ||
          rhs.type === NEW_NODE_TYPE.SELECT ||
          rhs.type === NEW_NODE_TYPE.CASE
        ) {
          const value =
            rhs.type === NEW_NODE_TYPE.FOR
              ? {
                  type: rhs.type,
                  token: lhs.token,
                  target: lhs,
                  from: rhs.from,
                  to: rhs.to,
                  inc: rhs.inc,
                }
              : rhs.type === NEW_NODE_TYPE.SELECT
              ? {
                  type: rhs.type,
                  token: lhs.token,
                  target: lhs,
                  list: rhs.list,
                }
              : {
                  type: rhs.type,
                  token: lhs.token,
                  target: lhs,
                  cond: rhs.cond,
                  thn: rhs.thn,
                  else: rhs.else,
                };

          return { type: NEW_NODE_TYPE.RETURN, token: node.token, value };
        }
        // assign
        return {
          type: NODE_TYPE.ASSIGN,
          token: node.token,
          lhs,
          rhs: rhs as newAst.Expr,
        };
      },

      [NODE_TYPE.TEST]: (node: ast.TestNode) => {
        const cond = this.visitNode(node.cond, visitor) as newAst.Expr;
        return { type: NEW_NODE_TYPE.IF, token: node.token, cond };
      },

      [NODE_TYPE.WHEN]: (node: ast.WhenNode) => {
        const cond = this.visitNode(node.cond, visitor) as newAst.Expr;
        return {
          type: NEW_NODE_TYPE.WHEN,
          token: node.token,
          cond,
        };
      },

      [NODE_TYPE.CASE]: (node: ast.CaseNode) => {
        const body = node.body.map((pattern) => {
          const cond = this.visitNode(pattern.cond, visitor) as newAst.Expr;
          const thn = this.visitNode(pattern.expr, visitor) as newAst.Expr;
          return { cond, thn };
        });
        const caseif: newAst.CaseIf = {
          type: NEW_NODE_TYPE.CASE,
          token: node.token,
          cond: body[0].cond,
          thn: body[0].thn,
          else: body.slice(1),
        };
        return caseif;
      },

      [NODE_TYPE.CALL]: (node: ast.CallNode) => {
        const input = this.visitNode(node.input, visitor) as newAst.Expr;
        const output = this.visitNode(node.output, visitor) as newAst.Expr;
        return {
          type: NEW_NODE_TYPE.CALL,
          token: node.token,
          module: node.module,
          input: input,
          output: output,
        };
      },

      ["stmt-block" as const]: (node: ast.StmtBlock) => {
        const body = node.body.map((stmt) =>
          this.visitNode((stmt as ast.Stmt).stmt, visitor)
        ) as newAst.StmtNode[];
        return {
          type: NEW_NODE_TYPE.CLASS,
          token: node.token,
          name: "",
          fieldList: [],
          body: [
            {
              type: NEW_NODE_TYPE.METHOD,
              token: node.token,
              body,
            },
          ],
        };
      },

      [NODE_TYPE.BLOCK]: (node: ast.Block) => {
        let when: newAst.Expr | undefined;
        if (node.when) when = this.visitNode(node.when, visitor) as newAst.Expr;

        const sortedStmts: ast.StmtBlock[] = sortStmt(node.body);
        const newBody = sortedStmts.map((stmt, index) => {
          const innerClass = this.visitNode(stmt, visitor) as newAst.Class;
          innerClass.name = `${index + 1}`;
          return innerClass;
        });

        const newField = node.varList.map((p) => {
          const v = this.visitNode(p, visitor);
          return { type: NEW_NODE_TYPE.PARAM, token: p.token, value: [v] };
        }) as newAst.ParamNode[];

        return {
          type: NEW_NODE_TYPE.CLASS,
          token: node.token,
          name: "",
          fieldList: newField,
          body: newBody,
          when: when,
        };
      },

      [NODE_TYPE.PARAM]: (node: ast.ParamNode) => {
        const member = (node as ast.Param).value as ast.Member[];
        const value = member.map((param) =>
          this.visitNode(param, visitor)
        ) as newAst.VarNode[];
        this.params.push(...value);
        return { type: NEW_NODE_TYPE.PARAM, token: node.token, value };
      },

      [NODE_TYPE.MODULE]: (node: ast.Module) => {
        const field = node.paramList.map((param) =>
          this.visitNode(param, visitor)
        ) as newAst.ParamNode[];
        const body = node.body.map((stmt) =>
          this.visitNode(stmt, visitor)
        ) as newAst.MethodNode[];
        body.forEach((inner, i) => {
          (inner as newAst.Class).name = `${i + 1}`;
        });

        return {
          type: NEW_NODE_TYPE.CLASS,
          token: node.token,
          name: node.name,
          fieldList: field,
          body,
        };
      },

      [NODE_TYPE.PROGRAM]: (node: ast.Program) => {
        const body = node.body.map((stmt) =>
          this.visitNode(stmt, visitor)
        ) as newAst.ClassNode[];
        return { type: NEW_NODE_TYPE.PROGRAM, body };
      },
    };

    return this.visitNode(input, visitor) as newAst.Program;
  }
}

export const converter = (input: ast.Node): newAst.Program =>
  new ASTConverter().convert(input);
