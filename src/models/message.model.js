"use strict";
require("../common/common")();
const { executeQuery } = require("../helpers/utils");
var Messages = function (data) {
  this.messageText = data.messageText;
  this.roomId = data.roomId;
  this.sentBy = data.sentBy;
  this.messageMedia = data.messageMedia;
  this.isRead = data.isRead || "N";
  this.groupId = data.groupId;
};

Messages.getMessages = async (limit, offset, roomId, groupId) => {
  const searchCount = await executeQuery(
    `SELECT count(m.id) as count FROM messages as m WHERE roomId = ${roomId} or groupId = ${groupId}`
  );
  const searchData = await executeQuery(
    `select m.*,p.Username,p.ProfilePicName,p.FirstName from messages as m left join profile as p on p.ID = m.sentBy where m.roomId =${roomId} or m.groupId = ${groupId} GROUP BY id order by createdDate limit ? offset ?`,
    [limit, offset]
  );
  return {
    count: searchCount?.[0]?.count || 0,
    messageList: searchData,
  };
};

Messages.getMembers = async (groupId, searchText) => {
  try {
    const query =
      "select gm.profileId as Id,p.Username,p.FirstName,p.ProfilePicName from groupMembers as gm left join profile as p on p.ID = gm.profileId where gm.groupId = ? and p.Username Like ? order by p.Username";
    const values = [groupId, `${searchText}%`];
    const memberList = await executeQuery(query, values);
    return memberList;
  } catch (error) {
    return error;
  }
};

module.exports = Messages;
