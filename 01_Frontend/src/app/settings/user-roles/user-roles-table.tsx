import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { USER_ROLE_VALUES, type User, type UserRole } from "@/lib/api";
import { labelToTitleCase } from "@/lib/detail-formatters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function UserRolesTable({
  users,
  isLoading,
  isError,
  errorMessage,
  onUserRoleChange,
  onUserDelete,
}: {
  users: User[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  onUserRoleChange: (user: User, role: UserRole) => void;
  onUserDelete: (user: User) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>E-Mail</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell>Loading users...</TableCell>
            </TableRow>
          ) : isError ? (
            <TableRow>
              <TableCell>{errorMessage}</TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell>No users found.</TableCell>
            </TableRow>
          ) : (
            users.map((user) => {
              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium tabular-nums">
                    {user.id}
                  </TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(role) =>
                        onUserRoleChange(user, role)
                      }
                    >
                      <SelectTrigger className="w-full md:max-w-sm" size="sm">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {USER_ROLE_VALUES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {labelToTitleCase(role)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={"destructive"}
                      onClick={() => onUserDelete(user)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
