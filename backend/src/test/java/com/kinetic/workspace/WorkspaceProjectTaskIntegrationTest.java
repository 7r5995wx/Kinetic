package com.kinetic.workspace;

import com.kinetic.foundation.error.ConflictException;
import com.kinetic.foundation.error.NotFoundException;
import com.kinetic.identity.domain.UserAccount;
import com.kinetic.identity.repository.UserAccountRepository;
import com.kinetic.identity.security.KineticUserPrincipal;
import com.kinetic.project.api.ProjectDtos;
import com.kinetic.project.domain.KanbanColumn;
import com.kinetic.project.repository.KanbanColumnRepository;
import com.kinetic.project.repository.ProjectRepository;
import com.kinetic.project.service.ProjectService;
import com.kinetic.task.api.TaskDtos;
import com.kinetic.task.domain.Task;
import com.kinetic.task.domain.TaskPriority;
import com.kinetic.task.repository.TaskRepository;
import com.kinetic.task.service.TaskService;
import com.kinetic.workspace.api.WorkspaceDtos;
import com.kinetic.workspace.repository.WorkspaceMembershipRepository;
import com.kinetic.workspace.repository.WorkspaceRepository;
import com.kinetic.workspace.security.WorkspaceRole;
import com.kinetic.workspace.service.WorkspaceService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
class WorkspaceProjectTaskIntegrationTest {

    @Autowired
    private WorkspaceService workspaces;

    @Autowired
    private ProjectService projects;

    @Autowired
    private TaskService tasks;

    @Autowired
    private UserAccountRepository users;

    @Autowired
    private WorkspaceRepository workspaceRepo;

    @Autowired
    private WorkspaceMembershipRepository memberships;

    @Autowired
    private ProjectRepository projectRepo;

    @Autowired
    private KanbanColumnRepository columns;

    @Autowired
    private TaskRepository taskRepo;

    private UUID owner;

    @BeforeEach
    void setup() {
        cleanup();
        UserAccount u = users.save(UserAccount.register("owner@example.com", "owner@example.com", "Owner", "hash"));
        owner = u.id();
        login(owner, u.email());
    }

    @AfterEach
    void cleanup() {
        taskRepo.deleteAll();
        columns.deleteAll();
        projectRepo.deleteAll();
        memberships.deleteAll();
        workspaceRepo.deleteAll();
        users.deleteAll();
        SecurityContextHolder.clearContext();
    }

    @Test
    void workspaceOwnerProjectBoardAndTaskFlowIsScopedAndVersioned() {
        var workspace = workspaces.create(new WorkspaceDtos.Create("Roadmap"));
        assertThat(workspaces.members(workspace.id())).singleElement().extracting(m -> m.role()).isEqualTo(WorkspaceRole.OWNER);

        var project = projects.create(workspace.id(), new ProjectDtos.Create("Launch", null));
        var board = projects.columns(project.id());
        assertThat(board).extracting(c -> c.name()).containsExactly("To do", "In progress", "Done");

        var task = tasks.create(project.id(), new TaskDtos.Create("Ship", null, board.getFirst().id(), TaskPriority.HIGH, null, null));
        assertThat(tasks.list(project.id(), board.getFirst().id(), TaskPriority.HIGH, null, PageRequest.of(0, 25))).hasSize(1);

        var moved = tasks.move(task.id(), new TaskDtos.Move(board.get(1).id(), 0, task.version()));
        assertThat(moved.columnId()).isEqualTo(board.get(1).id());

        assertThatThrownBy(() -> tasks.update(task.id(), new TaskDtos.Update("Ship", null, TaskPriority.HIGH, null, null, task.version())))
                .isInstanceOf(ConflictException.class);

        assertThatThrownBy(() -> workspaces.remove(workspace.id(), owner))
                .isInstanceOf(ConflictException.class);

        UserAccount outsider = users.save(UserAccount.register("out@example.com", "out@example.com", "Out", "hash"));
        login(outsider.id(), outsider.email());
        assertThatThrownBy(() -> projects.get(project.id())).isInstanceOf(NotFoundException.class);
    }

    @Test
    void taskReorderingWithinSameColumnRecalculatesPositionsContiguously() {
        var workspace = workspaces.create(new WorkspaceDtos.Create("Engineering"));
        var project = projects.create(workspace.id(), new ProjectDtos.Create("Sprint 1", "Active sprint"));
        List<KanbanColumn> board = projects.columns(project.id());
        UUID todoCol = board.get(0).id();

        Task t0 = tasks.create(project.id(), new TaskDtos.Create("Task 0", null, todoCol, TaskPriority.LOW, null, null));
        Task t1 = tasks.create(project.id(), new TaskDtos.Create("Task 1", null, todoCol, TaskPriority.MEDIUM, null, null));
        Task t2 = tasks.create(project.id(), new TaskDtos.Create("Task 2", null, todoCol, TaskPriority.HIGH, null, null));

        assertThat(t0.position()).isEqualTo(0);
        assertThat(t1.position()).isEqualTo(1);
        assertThat(t2.position()).isEqualTo(2);

        // Move task 2 to position 0
        Task movedT2 = tasks.move(t2.id(), new TaskDtos.Move(todoCol, 0, t2.version()));
        assertThat(movedT2.position()).isEqualTo(0);

        List<Task> reordered = taskRepo.findAllByColumnIdOrderByPositionAsc(todoCol);
        assertThat(reordered).extracting(Task::id).containsExactly(t2.id(), t0.id(), t1.id());
        assertThat(reordered).extracting(Task::position).containsExactly(0, 1, 2);

        // Move task 2 back down to position 2
        tasks.move(t2.id(), new TaskDtos.Move(todoCol, 2, movedT2.version()));
        List<Task> backDown = taskRepo.findAllByColumnIdOrderByPositionAsc(todoCol);
        assertThat(backDown).extracting(Task::id).containsExactly(t0.id(), t1.id(), t2.id());
        assertThat(backDown).extracting(Task::position).containsExactly(0, 1, 2);
    }

    @Test
    void taskMovementAcrossColumnsRecalculatesBothSourceAndTargetPositions() {
        var workspace = workspaces.create(new WorkspaceDtos.Create("Product"));
        var project = projects.create(workspace.id(), new ProjectDtos.Create("Features", null));
        List<KanbanColumn> board = projects.columns(project.id());
        UUID todoCol = board.get(0).id();
        UUID inProgressCol = board.get(1).id();

        Task t0 = tasks.create(project.id(), new TaskDtos.Create("Task 0", null, todoCol, TaskPriority.LOW, null, null));
        Task t1 = tasks.create(project.id(), new TaskDtos.Create("Task 1", null, todoCol, TaskPriority.MEDIUM, null, null));
        Task t2 = tasks.create(project.id(), new TaskDtos.Create("Task 2", null, todoCol, TaskPriority.HIGH, null, null));

        Task prog0 = tasks.create(project.id(), new TaskDtos.Create("Prog 0", null, inProgressCol, TaskPriority.URGENT, null, null));

        // Move t1 from todoCol to inProgressCol at position 0
        Task movedT1 = tasks.move(t1.id(), new TaskDtos.Move(inProgressCol, 0, t1.version()));
        assertThat(movedT1.columnId()).isEqualTo(inProgressCol);
        assertThat(movedT1.position()).isEqualTo(0);

        // Verify source column has t0 and t2 with re-compacted positions 0 and 1
        List<Task> remainingTodo = taskRepo.findAllByColumnIdOrderByPositionAsc(todoCol);
        assertThat(remainingTodo).extracting(Task::id).containsExactly(t0.id(), t2.id());
        assertThat(remainingTodo).extracting(Task::position).containsExactly(0, 1);

        // Verify target column has movedT1 and prog0 with positions 0 and 1
        List<Task> targetTasks = taskRepo.findAllByColumnIdOrderByPositionAsc(inProgressCol);
        assertThat(targetTasks).extracting(Task::id).containsExactly(t1.id(), prog0.id());
        assertThat(targetTasks).extracting(Task::position).containsExactly(0, 1);
    }

    @Test
    void taskDeletionRecompactsRemainingColumnPositions() {
        var workspace = workspaces.create(new WorkspaceDtos.Create("Ops"));
        var project = projects.create(workspace.id(), new ProjectDtos.Create("Infra", null));
        UUID todoCol = projects.columns(project.id()).get(0).id();

        Task t0 = tasks.create(project.id(), new TaskDtos.Create("Task 0", null, todoCol, TaskPriority.LOW, null, null));
        Task t1 = tasks.create(project.id(), new TaskDtos.Create("Task 1", null, todoCol, TaskPriority.MEDIUM, null, null));
        Task t2 = tasks.create(project.id(), new TaskDtos.Create("Task 2", null, todoCol, TaskPriority.HIGH, null, null));

        // Delete middle task t1
        tasks.delete(t1.id(), t1.version());

        List<Task> remaining = taskRepo.findAllByColumnIdOrderByPositionAsc(todoCol);
        assertThat(remaining).extracting(Task::id).containsExactly(t0.id(), t2.id());
        assertThat(remaining).extracting(Task::position).containsExactly(0, 1);
    }

    @Test
    void assigneeValidationEnforcesWorkspaceMembership() {
        var workspace = workspaces.create(new WorkspaceDtos.Create("Growth"));
        var project = projects.create(workspace.id(), new ProjectDtos.Create("Marketing", null));
        UUID col = projects.columns(project.id()).get(0).id();

        UserAccount outsider = users.save(UserAccount.register("outsider@example.com", "outsider@example.com", "Outsider", "hash"));

        assertThatThrownBy(() -> tasks.create(project.id(), new TaskDtos.Create("Ad Campaign", null, col, TaskPriority.MEDIUM, outsider.id(), null)))
                .isInstanceOf(NotFoundException.class);

        // Add outsider to workspace as MEMBER
        workspaces.addOrChange(workspace.id(), new WorkspaceDtos.MemberChange(outsider.id(), WorkspaceRole.MEMBER));

        // Now assignee assignment succeeds
        Task task = tasks.create(project.id(), new TaskDtos.Create("Ad Campaign", null, col, TaskPriority.MEDIUM, outsider.id(), null));
        assertThat(task.assigneeId()).isEqualTo(outsider.id());
    }

    @Test
    void projectDeletionRemovesTasksAndColumns() {
        var workspace = workspaces.create(new WorkspaceDtos.Create("Design"));
        var project = projects.create(workspace.id(), new ProjectDtos.Create("Brand Book", null));
        UUID col = projects.columns(project.id()).get(0).id();
        tasks.create(project.id(), new TaskDtos.Create("Logos", null, col, TaskPriority.HIGH, null, null));

        projects.delete(project.id());

        assertThat(projectRepo.findById(project.id())).isEmpty();
        assertThat(columns.findAllByProjectIdOrderByPositionAsc(project.id())).isEmpty();
        assertThat(taskRepo.findAll().stream().filter(t -> t.projectId().equals(project.id()))).isEmpty();
    }

    @Test
    void crossWorkspaceIsolationPreventsUnauthorizedAccess() {
        var wsA = workspaces.create(new WorkspaceDtos.Create("Company A"));
        var projA = projects.create(wsA.id(), new ProjectDtos.Create("Secret A", null));

        UserAccount userB = users.save(UserAccount.register("userB@example.com", "userB@example.com", "User B", "hash"));
        login(userB.id(), userB.email());
        var wsB = workspaces.create(new WorkspaceDtos.Create("Company B"));

        // User B cannot access Company A's project
        assertThatThrownBy(() -> projects.get(projA.id())).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> projects.update(projA.id(), new ProjectDtos.Update("Hacked", null))).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> projects.delete(projA.id())).isInstanceOf(NotFoundException.class);

        // User B cannot add tasks to Company A's project
        KanbanColumn colA = columns.findAllByProjectIdOrderByPositionAsc(projA.id()).getFirst();
        assertThatThrownBy(() -> tasks.create(projA.id(), new TaskDtos.Create("Injected", null, colA.id(), TaskPriority.LOW, null, null)))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void crossProjectColumnSubstitutionIsRejected() {
        var wsA = workspaces.create(new WorkspaceDtos.Create("Workspace A"));
        var proj1 = projects.create(wsA.id(), new ProjectDtos.Create("Project 1", null));
        var proj2 = projects.create(wsA.id(), new ProjectDtos.Create("Project 2", null));

        KanbanColumn colOfProj2 = columns.findAllByProjectIdOrderByPositionAsc(proj2.id()).getFirst();

        // Attempt to create a task in Project 1 using a column belonging to Project 2
        assertThatThrownBy(() -> tasks.create(proj1.id(), new TaskDtos.Create("Cross-project task", null, colOfProj2.id(), TaskPriority.HIGH, null, null)))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Kanban column was not found in project");
    }

    @Test
    void crossWorkspaceTaskAccessIsRejected() {
        var wsA = workspaces.create(new WorkspaceDtos.Create("Workspace A"));
        var projA = projects.create(wsA.id(), new ProjectDtos.Create("Project A", null));
        KanbanColumn colA = columns.findAllByProjectIdOrderByPositionAsc(projA.id()).getFirst();
        Task taskA = tasks.create(projA.id(), new TaskDtos.Create("Secret Task", null, colA.id(), TaskPriority.URGENT, null, null));

        UserAccount outsider = users.save(UserAccount.register("outsider@example.com", "outsider@example.com", "Outsider", "hash"));
        login(outsider.id(), outsider.email());

        // Outsider cannot get, update, move, or delete taskA
        assertThatThrownBy(() -> tasks.get(taskA.id())).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> tasks.update(taskA.id(), new TaskDtos.Update("Hacked", null, TaskPriority.LOW, null, null, taskA.version())))
                .isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> tasks.move(taskA.id(), new TaskDtos.Move(colA.id(), 0, taskA.version())))
                .isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> tasks.delete(taskA.id(), taskA.version()))
                .isInstanceOf(NotFoundException.class);
    }

    private void login(UUID id, String email) {
        var p = new KineticUserPrincipal(id, email, "hash");
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(p, null, p.getAuthorities())
        );
    }
}
